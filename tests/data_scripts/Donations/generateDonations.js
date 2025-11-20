import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Payment methods
const paymentMethods = ["gcash", "paymaya", "card", "bank", "cash"];

// Donation messages (optional)
const donationMessages = [
    "Thank you for supporting this cause!",
    "Every contribution makes a difference.",
    "Together we can make a change.",
    "Your generosity is appreciated.",
    "",
    "",
    "" // More empty strings for variety
];

// Load event data from event_data.txt
function loadEventData() {
    try {
        const eventDataPath = path.join(__dirname, '../Events/event_data.txt');
        
        if (!fs.existsSync(eventDataPath)) {
            throw new Error(`event_data.txt file not found at: ${eventDataPath}`);
        }
        
        console.log(`📂 Reading event data from: ${eventDataPath}`);
        const fileContent = fs.readFileSync(eventDataPath, 'utf8');
        const events = JSON.parse(fileContent);
        
        if (!Array.isArray(events)) {
            throw new Error('Event data file must contain a JSON array');
        }
        
        console.log(`✅ Loaded ${events.length} events`);
        return events;
    } catch (error) {
        console.error('❌ Error loading event data:', error.message);
        throw error;
    }
}

// Load event IDs from eventid.txt
function loadEventIds() {
    try {
        const eventIdPath = path.join(__dirname, '../Events/eventid.txt');
        
        if (!fs.existsSync(eventIdPath)) {
            throw new Error(`eventid.txt file not found at: ${eventIdPath}`);
        }
        
        console.log(`📂 Reading event IDs from: ${eventIdPath}`);
        const fileContent = fs.readFileSync(eventIdPath, 'utf8');
        const data = JSON.parse(fileContent);
        
        if (!data.mappings || !Array.isArray(data.mappings)) {
            throw new Error('Invalid eventid.txt format. Expected mappings array.');
        }
        
        // Create a map: title -> eventId
        const eventIdMap = {};
        data.mappings.forEach(mapping => {
            eventIdMap[mapping.title] = mapping.eventId;
        });
        
        console.log(`✅ Loaded ${Object.keys(eventIdMap).length} event ID mappings`);
        return eventIdMap;
    } catch (error) {
        console.error('❌ Error loading event IDs:', error.message);
        throw error;
    }
}

// Load user IDs from userId.txt
function loadUserIds() {
    try {
        const userIdPath = path.join(__dirname, '../Users/userId.txt');
        
        if (!fs.existsSync(userIdPath)) {
            throw new Error(`userId.txt file not found at: ${userIdPath}`);
        }
        
        console.log(`📂 Reading user IDs from: ${userIdPath}`);
        const fileContent = fs.readFileSync(userIdPath, 'utf8');
        const data = JSON.parse(fileContent);
        
        if (!data.mappings || !Array.isArray(data.mappings)) {
            throw new Error('Invalid userId.txt format. Expected mappings array.');
        }
        
        // Create a map: userId -> {name, email}
        const userMap = {};
        data.mappings.forEach(mapping => {
            userMap[mapping.userId] = {
                name: mapping.name,
                email: mapping.email
            };
        });
        
        console.log(`✅ Loaded ${Object.keys(userMap).length} user mappings`);
        return userMap;
    } catch (error) {
        console.error('❌ Error loading user IDs:', error.message);
        throw error;
    }
}

// Get random element from array
function randomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Generate donations from event data
function generateDonations() {
    const events = loadEventData();
    const eventIdMap = loadEventIds();
    const userMap = loadUserIds();
    
    const donations = [];
    let skippedCount = 0;
    
    console.log(`\n🔄 Processing donations from ${events.length} events...`);
    
    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const eventTitle = event.title;
        const eventId = eventIdMap[eventTitle];
        
        if (!eventId) {
            console.log(`⚠️  Event "${eventTitle}" not found in eventid.txt, skipping...`);
            skippedCount += event.donations?.length || 0;
            continue;
        }
        
        if (!event.donations || !Array.isArray(event.donations) || event.donations.length === 0) {
            console.log(`⚠️  Event "${eventTitle}" has no donations, skipping...`);
            continue;
        }
        
        console.log(`\n📋 Processing event "${eventTitle}" (${event.donations.length} donations)...`);
        
        for (let j = 0; j < event.donations.length; j++) {
            const eventDonation = event.donations[j];
            const donorId = eventDonation.donor;
            const amount = eventDonation.amount;
            const donatedAt = eventDonation.donatedAt;
            
            // Look up donor information
            const donorInfo = userMap[donorId];
            
            if (!donorInfo) {
                console.log(`   ⚠️  Donor ${donorId} not found in userId.txt, skipping donation...`);
                skippedCount++;
                continue;
            }
            
            // Generate donation record
            const donation = {
                donorName: donorInfo.name,
                donorEmail: donorInfo.email,
                amount: amount,
                message: randomElement(donationMessages),
                paymentMethod: randomElement(paymentMethods),
                status: "succeeded", // All donations are completed
                cashVerification: {
                    verifiedBy: null,
                    verifiedAt: null,
                    verificationNotes: "",
                    receiptNumber: "",
                    completedBy: null,
                    completedAt: null
                },
                paymongoReferenceId: "", // Empty for now (could generate fake IDs if needed)
                clientKey: "",
                sourceCheckoutUrl: "",
                receiptUrl: "",
                user: donorId, // Donor user ID
                event: eventId, // Event ID from eventid.txt
                recipientType: "event", // All donations are for events
                department: null, // No department for event donations
                isAnonymous: false,
                walletUserId: null, // Will be set by system based on event's createdBy
                createdAt: new Date(donatedAt), // Use donatedAt as createdAt
                updatedAt: new Date(donatedAt) // Use donatedAt as updatedAt
            };
            
            donations.push(donation);
        }
        
        console.log(`   ✅ Processed ${event.donations.length} donations for "${eventTitle}"`);
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total donations generated: ${donations.length}`);
    console.log(`   Skipped: ${skippedCount}`);
    
    return donations;
}

// Main execution
function main() {
    try {
        console.log('Generating donation records from event data...\n');
        const donations = generateDonations();
        
        // Calculate statistics
        const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);
        const paymentMethodBreakdown = {};
        donations.forEach(d => {
            paymentMethodBreakdown[d.paymentMethod] = (paymentMethodBreakdown[d.paymentMethod] || 0) + 1;
        });
        
        console.log(`\n💰 Total donation amount: ₱${totalAmount.toLocaleString()}`);
        console.log(`💳 Payment method breakdown:`, paymentMethodBreakdown);
        
        // Save to donation_data.txt
        const dataPath = path.join(__dirname, 'donation_data.txt');
        fs.writeFileSync(dataPath, JSON.stringify(donations, null, 2));
        console.log(`\n✅ Data saved to: ${dataPath}`);
        console.log(`📝 Total donations: ${donations.length}`);
        
    } catch (error) {
        console.error('❌ Error generating donations:', error);
        process.exit(1);
    }
}

main();

