import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CURRENT_DATE = new Date('2025-11-19T00:00:00.000Z');

// Skills pool for volunteers
const skillsPool = [
    "Communication", "Leadership", "Teamwork", "Problem Solving", "Time Management",
    "Event Planning", "Public Speaking", "Teaching", "Mentoring", "Technical Support",
    "Data Entry", "Customer Service", "Photography", "Videography", "Social Media",
    "Graphic Design", "Writing", "Research", "Coordination", "Logistics"
];

// Feedback comments pool
const feedbackComments = [
    "Great experience! Learned a lot and met amazing people.",
    "The event was well-organized and meaningful. Thank you!",
    "Enjoyed volunteering and contributing to the community.",
    "Very rewarding experience. Would volunteer again!",
    "The event exceeded my expectations. Great team!",
    "Wonderful opportunity to give back to the community.",
    "Well-structured event with clear objectives.",
    "Had a fantastic time volunteering. Highly recommend!",
    "The organizers were professional and supportive.",
    "Meaningful work that made a real difference.",
    "Great learning opportunity and community engagement.",
    "The event was impactful and well-executed.",
    "Enjoyed every moment of volunteering.",
    "Professional and well-coordinated event.",
    "Made valuable connections while serving the community."
];

// Helper functions
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function randomElements(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, array.length));
}

function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function calculateAge(birthday) {
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function formatDateString(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDaysBetween(startDate, endDate) {
    const days = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);
    
    while (current <= end) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    
    return days;
}

// Load event data
function loadEventData() {
    try {
        const eventDataPath = path.join(__dirname, '../Events/event_data.txt');
        if (!fs.existsSync(eventDataPath)) {
            throw new Error(`event_data.txt not found at: ${eventDataPath}`);
        }
        const fileContent = fs.readFileSync(eventDataPath, 'utf8');
        const events = JSON.parse(fileContent);
        console.log(`✅ Loaded ${events.length} events`);
        return events;
    } catch (error) {
        console.error('❌ Error loading event data:', error.message);
        throw error;
    }
}

// Load event IDs
function loadEventIds() {
    try {
        const eventIdPath = path.join(__dirname, '../Events/eventid.txt');
        if (!fs.existsSync(eventIdPath)) {
            throw new Error(`eventid.txt not found at: ${eventIdPath}`);
        }
        const fileContent = fs.readFileSync(eventIdPath, 'utf8');
        const data = JSON.parse(fileContent);
        
        if (!data.mappings || !Array.isArray(data.mappings)) {
            throw new Error('Invalid eventid.txt format');
        }
        
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

// Load user data
function loadUserData() {
    try {
        const userDataPath = path.join(__dirname, '../Users/User_data.txt');
        if (!fs.existsSync(userDataPath)) {
            throw new Error(`User_data.txt not found at: ${userDataPath}`);
        }
        const fileContent = fs.readFileSync(userDataPath, 'utf8');
        const users = JSON.parse(fileContent);
        console.log(`✅ Loaded ${users.length} users`);
        return users;
    } catch (error) {
        console.error('❌ Error loading user data:', error.message);
        throw error;
    }
}

// Load user IDs
function loadUserIds() {
    try {
        const userIdPath = path.join(__dirname, '../Users/userId.txt');
        if (!fs.existsSync(userIdPath)) {
            throw new Error(`userId.txt not found at: ${userIdPath}`);
        }
        const fileContent = fs.readFileSync(userIdPath, 'utf8');
        const data = JSON.parse(fileContent);
        
        if (!data.mappings || !Array.isArray(data.mappings)) {
            throw new Error('Invalid userId.txt format');
        }
        
        const userMap = {};
        data.mappings.forEach(mapping => {
            userMap[mapping.userId] = {
                name: mapping.name,
                email: mapping.email
            };
        });
        
        console.log(`✅ Loaded ${Object.keys(userMap).length} user ID mappings`);
        return userMap;
    } catch (error) {
        console.error('❌ Error loading user IDs:', error.message);
        throw error;
    }
}

// Generate attendance records for a volunteer for an event
function generateAttendanceRecords(event, volunteerUserId) {
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    
    // Only generate attendance for past events
    if (endDate > CURRENT_DATE) {
        return [];
    }
    
    const days = getDaysBetween(startDate, endDate);
    const attendanceRecords = [];
    
    for (const day of days) {
        // Random timeIn between 8 AM and 10 AM
        const timeInHour = randomInt(8, 10);
        const timeInMinute = randomInt(0, 59);
        const timeIn = new Date(day);
        timeIn.setHours(timeInHour, timeInMinute, 0, 0);
        
        // Random timeOut between 4 PM and 6 PM (must be after timeIn)
        const timeOutHour = randomInt(16, 18);
        const timeOutMinute = randomInt(0, 59);
        const timeOut = new Date(day);
        timeOut.setHours(timeOutHour, timeOutMinute, 0, 0);
        
        // Ensure timeOut is after timeIn
        if (timeOut <= timeIn) {
            timeOut.setHours(timeInHour + 6, timeInMinute, 0, 0);
        }
        
        // Calculate total hours
        const totalHours = (timeOut - timeIn) / (1000 * 60 * 60);
        
        attendanceRecords.push({
            date: new Date(day),
            timeIn: timeIn,
            timeOut: timeOut,
            totalHours: Math.round(totalHours * 100) / 100, // Round to 2 decimal places
            isValid: true, // All records are valid
            qrCode: "", // Empty for generated data
            createdAt: new Date(day)
        });
    }
    
    return attendanceRecords;
}

// Generate volunteer data
function generateVolunteerData() {
    const events = loadEventData();
    const eventIdMap = loadEventIds();
    const users = loadUserData();
    const userMap = loadUserIds();
    
    // Create a map of userId to user data for quick lookup
    const userDataMap = {};
    users.forEach(user => {
        const userId = Object.keys(userMap).find(id => userMap[id].email === user.email);
        if (userId) {
            userDataMap[userId] = user;
        }
    });
    
    const volunteerData = [];
    
    console.log(`\n🔄 Processing ${events.length} events...`);
    
    for (const event of events) {
        const eventTitle = event.title;
        const eventId = eventIdMap[eventTitle];
        
        if (!eventId) {
            console.log(`⚠️  Event "${eventTitle}" not found in eventid.txt, skipping...`);
            continue;
        }
        
        if (!event.volunteers || event.volunteers.length === 0) {
            console.log(`⚠️  Event "${eventTitle}" has no volunteers, skipping...`);
            continue;
        }
        
        console.log(`\n📋 Processing event "${eventTitle}" (${event.volunteers.length} volunteers)...`);
        
        const volunteerRegistrations = [];
        const feedbackEntries = [];
        
        // Determine how many volunteers will submit feedback (70-90%)
        const feedbackCount = Math.floor(event.volunteers.length * (0.7 + Math.random() * 0.2));
        const feedbackVolunteers = randomElements(event.volunteers, feedbackCount);
        
        for (const volunteerUserId of event.volunteers) {
            const userInfo = userMap[volunteerUserId];
            const userData = userDataMap[volunteerUserId];
            
            if (!userInfo || !userData) {
                console.log(`   ⚠️  Volunteer ${volunteerUserId} not found in user data, skipping...`);
                continue;
            }
            
            // Calculate age from birthday
            const age = userData.birthday ? calculateAge(userData.birthday) : randomInt(18, 65);
            
            // Generate joinedAt date (between event createdAt and startDate)
            const eventCreatedAt = new Date(event.createdAt);
            const eventStartDate = new Date(event.startDate);
            const joinedAt = randomDate(eventCreatedAt, eventStartDate);
            
            // Generate attendance records
            const attendanceRecords = generateAttendanceRecords(event, volunteerUserId);
            
            // Create volunteer registration
            const volunteerRegistration = {
                user: volunteerUserId,
                name: userInfo.name,
                email: userInfo.email,
                age: age,
                department: userData.department || "",
                skills: randomElements(skillsPool, randomInt(2, 5)),
                additionalNotes: "",
                joinedAt: joinedAt,
                status: "approved",
                invitedBy: null,
                invitedAt: null,
                acceptedAt: joinedAt,
                attendanceRecords: attendanceRecords
            };
            
            volunteerRegistrations.push(volunteerRegistration);
            
            // Generate feedback for selected volunteers
            if (feedbackVolunteers.includes(volunteerUserId)) {
                const eventEndDate = new Date(event.endDate);
                const feedbackDeadline = new Date(eventEndDate);
                feedbackDeadline.setHours(feedbackDeadline.getHours() + 48);
                
                // Rating weighted toward 4-5
                const ratingRoll = Math.random();
                let rating;
                if (ratingRoll < 0.1) rating = 1;
                else if (ratingRoll < 0.2) rating = 2;
                else if (ratingRoll < 0.3) rating = 3;
                else if (ratingRoll < 0.6) rating = 4;
                else rating = 5;
                
                const feedbackEntry = {
                    volunteerId: volunteerUserId,
                    rating: rating,
                    comment: randomElement(feedbackComments),
                    submittedAt: randomDate(eventEndDate, feedbackDeadline),
                    attendanceId: null // Will be set when linking to attendance documents
                };
                
                feedbackEntries.push(feedbackEntry);
            }
        }
        
        volunteerData.push({
            eventId: eventId,
            eventTitle: eventTitle,
            volunteerRegistrations: volunteerRegistrations,
            feedback: feedbackEntries
        });
        
        console.log(`   ✅ Generated ${volunteerRegistrations.length} registrations and ${feedbackEntries.length} feedback entries`);
    }
    
    return volunteerData;
}

// Main execution
function main() {
    try {
        console.log('Generating volunteer registration data...\n');
        const volunteerData = generateVolunteerData();
        
        // Calculate statistics
        let totalRegistrations = 0;
        let totalFeedback = 0;
        let totalAttendanceRecords = 0;
        
        volunteerData.forEach(eventData => {
            totalRegistrations += eventData.volunteerRegistrations.length;
            totalFeedback += eventData.feedback.length;
            eventData.volunteerRegistrations.forEach(reg => {
                totalAttendanceRecords += reg.attendanceRecords.length;
            });
        });
        
        console.log(`\n📊 Summary:`);
        console.log(`   Total events processed: ${volunteerData.length}`);
        console.log(`   Total volunteer registrations: ${totalRegistrations}`);
        console.log(`   Total feedback entries: ${totalFeedback}`);
        console.log(`   Total attendance records: ${totalAttendanceRecords}`);
        
        // Save to volunteer_data.txt
        const dataPath = path.join(__dirname, 'volunteer_data.txt');
        fs.writeFileSync(dataPath, JSON.stringify(volunteerData, null, 2));
        console.log(`\n✅ Data saved to: ${dataPath}`);
        
    } catch (error) {
        console.error('❌ Error generating volunteer data:', error);
        process.exit(1);
    }
}

main();

