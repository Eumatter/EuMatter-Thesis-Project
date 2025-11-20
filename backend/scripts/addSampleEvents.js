import mongoose from 'mongoose';
import 'dotenv/config';
import Event from '../models/eventModel.js';
import User from '../models/userModel.js';
import https from 'https';
import { Buffer } from 'buffer';

// Connect to MongoDB
const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGO_URI or MONGODB_URI environment variable is not set');
        }
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

// Download image from URL and convert to base64
const downloadImageToBase64 = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download image: ${response.statusCode}`));
                return;
            }

            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const base64 = buffer.toString('base64');
                resolve(base64);
            });
        }).on('error', reject);
    });
};

// Sample events data
const sampleEvents = [
    {
        title: "Community Health Outreach Program",
        description: "Join us for a comprehensive community health outreach program focused on providing free medical check-ups, health education, and wellness activities for families in underserved areas. This event aims to promote preventive healthcare and raise awareness about important health issues affecting our community.",
        startDate: new Date('2024-11-21T08:00:00'),
        endDate: new Date('2024-11-21T17:00:00'),
        location: "Barangay Health Center, Lucena City",
        imageUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop",
        isOpenForDonation: true,
        isOpenForVolunteer: true,
        donationTarget: 50000,
        eventCategory: "community_extension",
        status: "Approved"
    },
    {
        title: "Environmental Cleanup and Tree Planting",
        description: "Help us make a positive impact on our environment! This event combines a community cleanup drive with a tree planting initiative. Volunteers will help clean up local parks and waterways, followed by planting native tree species to support environmental conservation efforts.",
        startDate: new Date('2024-11-23T07:00:00'),
        endDate: new Date('2024-11-23T15:00:00'),
        location: "Quezon Memorial Circle, Lucena City",
        imageUrl: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&h=600&fit=crop",
        isOpenForDonation: true,
        isOpenForVolunteer: true,
        donationTarget: 30000,
        eventCategory: "community_relations",
        status: "Approved"
    },
    {
        title: "Educational Support for Underprivileged Children",
        description: "Support education for children in need! This multi-day event provides educational materials, school supplies, and tutoring sessions for underprivileged children. We'll also organize fun learning activities and workshops to inspire a love for learning. Your donations and volunteer time will make a significant difference in these children's educational journey.",
        startDate: new Date('2024-11-24T09:00:00'),
        endDate: new Date('2024-11-25T16:00:00'),
        location: "MSEUF Community Extension Center, Lucena City",
        imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=600&fit=crop",
        isOpenForDonation: true,
        isOpenForVolunteer: true,
        donationTarget: 75000,
        eventCategory: "community_extension",
        status: "Approved"
    }
];

const addSampleEvents = async () => {
    try {
        await connectDB();

        // Find a CRD Staff or Department user to use as creator
        let creator = await User.findOne({
            $or: [
                { role: 'CRD Staff' },
                { role: 'Department/Organization' },
                { role: 'System Administrator' }
            ]
        });

        // If no suitable user found, find any user
        if (!creator) {
            creator = await User.findOne();
        }

        if (!creator) {
            console.error('❌ No user found in database. Please create a user first.');
            process.exit(1);
        }

        console.log(`✅ Using creator: ${creator.name} (${creator.email})`);

        // Process each event
        for (const eventData of sampleEvents) {
            try {
                console.log(`\n📅 Creating event: ${eventData.title}`);

                // Download and convert image to base64
                let imageBase64 = '';
                try {
                    console.log(`   Downloading image from: ${eventData.imageUrl}`);
                    imageBase64 = await downloadImageToBase64(eventData.imageUrl);
                    console.log(`   ✅ Image downloaded and converted to base64 (${imageBase64.length} chars)`);
                } catch (error) {
                    console.warn(`   ⚠️ Failed to download image: ${error.message}`);
                    console.warn(`   Continuing without image...`);
                }

                // Check if event already exists
                const existingEvent = await Event.findOne({
                    title: eventData.title,
                    startDate: eventData.startDate
                });

                if (existingEvent) {
                    console.log(`   ⚠️ Event already exists, skipping...`);
                    continue;
                }

                // Create the event
                const newEvent = new Event({
                    title: eventData.title,
                    description: eventData.description,
                    startDate: eventData.startDate,
                    endDate: eventData.endDate,
                    location: eventData.location,
                    createdBy: creator._id,
                    image: imageBase64,
                    isOpenForDonation: eventData.isOpenForDonation,
                    isOpenForVolunteer: eventData.isOpenForVolunteer,
                    donationTarget: eventData.donationTarget,
                    eventCategory: eventData.eventCategory,
                    status: eventData.status,
                    reviewedBy: creator._id,
                    reviewedAt: new Date(),
                    volunteerSettings: {
                        mode: 'open_for_all',
                        requireTimeTracking: true,
                        dailySchedule: [
                            {
                                date: eventData.startDate,
                                timeIn: eventData.startDate.toTimeString().slice(0, 5),
                                timeOut: eventData.endDate.toTimeString().slice(0, 5),
                                notes: ''
                            }
                        ]
                    }
                });

                await newEvent.save();
                console.log(`   ✅ Event created successfully!`);
                console.log(`   📍 Location: ${eventData.location}`);
                console.log(`   📅 Date: ${eventData.startDate.toLocaleDateString()} - ${eventData.endDate.toLocaleDateString()}`);
                console.log(`   💰 Donation Target: ₱${eventData.donationTarget.toLocaleString()}`);
                console.log(`   👥 Open for Volunteers: Yes`);
                console.log(`   💵 Open for Donations: Yes`);

            } catch (error) {
                console.error(`   ❌ Error creating event "${eventData.title}":`, error.message);
            }
        }

        console.log('\n✅ Sample events creation completed!');
        console.log('\n📊 Summary:');
        const totalEvents = await Event.countDocuments();
        console.log(`   Total events in database: ${totalEvents}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
        process.exit(0);
    }
};

// Run the script
addSampleEvents();

