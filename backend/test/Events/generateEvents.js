import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Department IDs
const DEPARTMENTS = {
    CCMS: {
        id: "68c77fc7d8714ef0c8fcb192",
        name: "College of Computing and Multimedia Services"
    },
    CAS: {
        id: "691e22b04e0971bff7a7993f",
        name: "College of Arts and Sciences"
    }
};

// Current date: November 19, 2025
const CURRENT_DATE = new Date('2025-11-19T00:00:00.000Z');

// Event titles for community extension services
const eventTitles = [
    "Community Computer Literacy Program",
    "Digital Skills Training for Senior Citizens",
    "Free Coding Workshop for Youth",
    "Cybersecurity Awareness Seminar",
    "Web Development Bootcamp",
    "Mobile App Development Training",
    "IT Support for Local Businesses",
    "Digital Marketing Workshop",
    "Community Art Exhibition",
    "Creative Writing Workshop",
    "Environmental Awareness Campaign",
    "Mental Health Support Program",
    "Literacy Program for Children",
    "Cultural Heritage Preservation",
    "Community Garden Initiative"
];

// Event descriptions
const eventDescriptions = [
    "A comprehensive program aimed at improving digital literacy in the community.",
    "Training sessions designed to help community members develop essential skills.",
    "An outreach program connecting students with local community needs.",
    "Educational workshops focusing on practical applications and real-world solutions.",
    "Community engagement activities promoting collaboration and learning.",
    "A series of sessions designed to empower community members through education.",
    "Hands-on training programs addressing local community challenges.",
    "Interactive workshops combining theory and practical application.",
    "Community-focused initiatives promoting social responsibility and engagement.",
    "Educational programs designed to bridge knowledge gaps in the community."
];

// Locations in Philippines
const locations = [
    "Manila", "Quezon City", "Makati", "Taguig", "Pasig", "Mandaluyong",
    "San Juan", "Marikina", "Caloocan", "Las Pinas", "Paranaque",
    "Muntinlupa", "Valenzuela", "Malabon", "Navotas", "Pasay",
    "Lucena", "Batangas City", "Lipa", "Tanauan", "Calamba",
    "San Pablo", "Santa Rosa", "Binan", "Cabuyao", "San Pedro"
];

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
        
        const userIds = data.mappings.map(mapping => mapping.userId);
        console.log(`✅ Loaded ${userIds.length} user IDs`);
        return userIds;
    } catch (error) {
        console.error('❌ Error loading user IDs:', error.message);
        throw error;
    }
}

// Generate random integer between min and max (inclusive)
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Get random element from array
function randomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Get random elements from array (without duplicates)
function randomElements(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, array.length));
}

// Generate random date between start and end
function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Generate event dates (12 past days + 3 future days from event's reference date)
// Events are distributed from January 2025 to November 19, 2025
function generateEventDates(eventIndex, totalEvents) {
    // Distribute events across Jan 1, 2025 to Nov 19, 2025
    const startRange = new Date('2025-01-01T00:00:00.000Z');
    const endRange = new Date('2025-11-19T00:00:00.000Z');
    
    // Calculate the reference date for this event (distributed evenly or randomly)
    // Using a mix of even distribution and some randomness
    const progress = eventIndex / (totalEvents - 1); // 0 to 1
    const randomOffset = (Math.random() - 0.5) * 0.2; // ±10% random offset
    const adjustedProgress = Math.max(0, Math.min(1, progress + randomOffset));
    
    const referenceDate = new Date(
        startRange.getTime() + 
        adjustedProgress * (endRange.getTime() - startRange.getTime())
    );
    
    // Event start date: 12 days before reference date
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - 12);
    startDate.setHours(8, 0, 0, 0); // Set to 8:00 AM
    
    // Event end date: 3 days after reference date
    // But ensure it doesn't exceed November 19, 2025
    const endDate = new Date(referenceDate);
    endDate.setDate(endDate.getDate() + 3);
    endDate.setHours(17, 0, 0, 0); // Set to 5:00 PM
    
    // If end date exceeds Nov 19, 2025, cap it
    if (endDate > CURRENT_DATE) {
        endDate.setTime(CURRENT_DATE.getTime());
        endDate.setHours(17, 0, 0, 0);
    }
    
    // Ensure start date is not before Jan 1, 2025
    const minStartDate = new Date('2025-01-01T08:00:00.000Z');
    if (startDate < minStartDate) {
        startDate.setTime(minStartDate.getTime());
    }
    
    return { startDate, endDate };
}

// Generate donation dates (before event startDate and before Nov 19, 2025)
function generateDonationDate(eventStartDate) {
    // Donations can occur from 30 days before event start, up to event start date
    // But must be before Nov 19, 2025
    const earliestDate = new Date(eventStartDate);
    earliestDate.setDate(earliestDate.getDate() - 30);
    
    // Ensure earliest date is not before Jan 1, 2025
    const minDate = new Date('2025-01-01T00:00:00.000Z');
    if (earliestDate < minDate) {
        earliestDate.setTime(minDate.getTime());
    }
    
    let latestDate = new Date(eventStartDate);
    // Ensure it's before Nov 19, 2025
    if (latestDate > CURRENT_DATE) {
        latestDate.setTime(CURRENT_DATE.getTime() - 24 * 60 * 60 * 1000); // 1 day before current date
    }
    
    // Ensure latestDate is not before earliestDate
    if (latestDate < earliestDate) {
        latestDate = new Date(earliestDate);
    }
    
    return randomDate(earliestDate, latestDate);
}

// Generate events
function generateEvents() {
    const userIds = loadUserIds();
    const events = [];
    
    // Distribute events: 8 CCMS, 7 CAS
    const distribution = [
        { dept: 'CCMS', count: 8 },
        { dept: 'CAS', count: 7 }
    ];
    
    let eventIndex = 0;
    const totalEvents = 15;
    
    for (const dist of distribution) {
        const department = DEPARTMENTS[dist.dept];
        
        for (let i = 0; i < dist.count; i++) {
            const { startDate, endDate } = generateEventDates(eventIndex, totalEvents);
            
            // Random number of volunteers (3-15)
            const volunteerCount = randomInt(3, 15);
            const volunteers = randomElements(userIds, volunteerCount);
            
            // Random number of donations (5-20)
            const donationCount = randomInt(5, 20);
            const donationDonors = randomElements(userIds, donationCount);
            
            // Generate donations
            const donations = [];
            let totalDonations = 0;
            
            for (const donorId of donationDonors) {
                const amount = randomInt(100, 10000); // 100-10000 PHP
                const donatedAt = generateDonationDate(startDate);
                
                donations.push({
                    donor: donorId,
                    amount: amount,
                    donatedAt: donatedAt
                });
                
                totalDonations += amount;
            }
            
            // Event created date: 7-30 days before start date
            const createdAt = new Date(startDate);
            createdAt.setDate(createdAt.getDate() - randomInt(7, 30));
            createdAt.setHours(10, 0, 0, 0);
            
            // Ensure createdAt is not before Jan 1, 2025
            const minCreatedDate = new Date('2025-01-01T00:00:00.000Z');
            if (createdAt < minCreatedDate) {
                createdAt.setTime(minCreatedDate.getTime());
            }
            
            // Generate event
            const event = {
                title: eventTitles[eventIndex % eventTitles.length],
                description: randomElement(eventDescriptions),
                startDate: startDate,
                endDate: endDate,
                location: randomElement(locations),
                createdBy: department.id,
                volunteers: volunteers,
                donations: donations,
                totalDonations: totalDonations,
                status: "Proposed",
                eventCategory: "community_extension",
                image: "",
                proposalDocument: "",
                isOpenForDonation: true,
                isOpenForVolunteer: true,
                donationTarget: totalDonations + randomInt(5000, 20000), // Target higher than current donations
                volunteerRegistrations: [],
                feedback: [],
                comments: [],
                reactions: {
                    like: [],
                    love: [],
                    haha: [],
                    wow: [],
                    sad: [],
                    angry: []
                },
                reviewedBy: null,
                reviewedAt: null,
                facebookPostId: null,
                facebookPostedAt: null,
                facebookPageId: null,
                createdAt: createdAt,
                updatedAt: createdAt
            };
            
            events.push(event);
            eventIndex++;
        }
    }
    
    return events;
}

// Main execution
function main() {
    try {
        console.log('Generating 15 events...');
        const events = generateEvents();
        
        console.log(`\n✅ Generated ${events.length} events`);
        console.log('Event breakdown:');
        const breakdown = {};
        events.forEach(event => {
            const deptName = event.createdBy === DEPARTMENTS.CCMS.id ? 'CCMS' : 'CAS';
            breakdown[deptName] = (breakdown[deptName] || 0) + 1;
        });
        console.log(breakdown);
        
        // Calculate totals
        const totalVolunteers = events.reduce((sum, e) => sum + e.volunteers.length, 0);
        const totalDonations = events.reduce((sum, e) => sum + e.donations.length, 0);
        const totalDonationAmount = events.reduce((sum, e) => sum + e.totalDonations, 0);
        
        console.log(`\n📊 Statistics:`);
        console.log(`   Total volunteers assigned: ${totalVolunteers}`);
        console.log(`   Total donations: ${totalDonations}`);
        console.log(`   Total donation amount: ₱${totalDonationAmount.toLocaleString()}`);
        
        // Save to event_data.txt
        const dataPath = path.join(__dirname, 'event_data.txt');
        fs.writeFileSync(dataPath, JSON.stringify(events, null, 2));
        console.log(`\n✅ Data saved to: ${dataPath}`);
        
    } catch (error) {
        console.error('❌ Error generating events:', error);
        process.exit(1);
    }
}

main();

