import mongoose from "mongoose";
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import userModel from "../../models/userModel.js";

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

// Read user data from data.txt
function loadUserData() {
    try {
        // Try multiple possible paths
        // Script location: backend/test/Users/bulkInsertUsers.js
        // data.txt locations: root/Eumatter/data.txt or EuMatter-Thesis-Project/data.txt
        const possiblePaths = [
            path.join(__dirname, '../../../../data.txt'), // From backend/test/Users -> backend -> EuMatter-Thesis-Project -> root
            path.join(__dirname, '../../../data.txt'), // From backend/test/Users -> backend -> EuMatter-Thesis-Project
            path.join(__dirname, '../../data.txt'), // From backend/test/Users -> backend
            path.join(process.cwd(), 'data.txt'), // Current working directory
            path.join(process.cwd(), '../data.txt'), // Parent of current working directory
            path.join(process.cwd(), '../../data.txt'), // Two levels up
            path.resolve('./data.txt'),
            path.resolve('../data.txt')
        ];
        
        let dataPath = null;
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                dataPath = p;
                break;
            }
        }
        
        if (!dataPath) {
            throw new Error('data.txt file not found. Tried paths: ' + possiblePaths.join(', '));
        }
        
        console.log(`📂 Reading data from: ${dataPath}`);
        const fileContent = fs.readFileSync(dataPath, 'utf8');
        const users = JSON.parse(fileContent);
        
        if (!Array.isArray(users)) {
            throw new Error('Data file must contain a JSON array');
        }
        
        console.log(`✅ Loaded ${users.length} users from data.txt`);
        return users;
    } catch (error) {
        console.error('❌ Error loading user data:', error.message);
        throw error;
    }
}

// Bulk insert users
async function bulkInsertUsers() {
    try {
        // Connect to database
        await connectDB();
        
        // Load user data
        const users = loadUserData();
        
        console.log(`\n📊 User breakdown:`);
        const breakdown = {};
        users.forEach(user => {
            const key = `${user.userType} - ${user.mseufCategory || user.outsiderCategory || 'N/A'}`;
            breakdown[key] = (breakdown[key] || 0) + 1;
        });
        console.log(breakdown);
        
        // Check for existing users by email
        console.log('\n🔍 Checking for existing users...');
        const emails = users.map(u => u.email);
        const existingUsers = await userModel.find({ email: { $in: emails } }).select('email').lean();
        const existingEmails = new Set(existingUsers.map(u => u.email));
        
        if (existingEmails.size > 0) {
            console.log(`⚠️  Found ${existingEmails.size} existing users with matching emails:`);
            existingEmails.forEach(email => console.log(`   - ${email}`));
        }
        
        // Filter out users that already exist
        const newUsers = users.filter(user => !existingEmails.has(user.email));
        
        if (newUsers.length === 0) {
            console.log('\n✅ All users already exist in database. No new users to insert.');
            await mongoose.connection.close();
            return;
        }
        
        console.log(`\n📝 Inserting ${newUsers.length} new users (skipping ${users.length - newUsers.length} duplicates)...`);
        
        // Convert dates from strings to Date objects
        const usersToInsert = newUsers.map(user => ({
            ...user,
            birthday: user.birthday ? new Date(user.birthday) : null,
            createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
            updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date()
        }));
        
        // Insert users
        const result = await userModel.insertMany(usersToInsert, {
            ordered: false, // Continue inserting even if some fail
            rawResult: false
        });
        
        console.log(`\n✅ Successfully inserted ${result.length} users!`);
        console.log(`📅 Date range: ${new Date(Math.min(...usersToInsert.map(u => u.createdAt))).toLocaleDateString()} to ${new Date(Math.max(...usersToInsert.map(u => u.createdAt))).toLocaleDateString()}`);
        
        // Verify insertion
        const insertedCount = await userModel.countDocuments({
            email: { $in: usersToInsert.map(u => u.email) },
            isAccountVerified: true
        });
        console.log(`✅ Verified: ${insertedCount} users found in database with isAccountVerified: true`);
        
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
            console.log(`\n✅ Successfully inserted ${error.insertedCount || 0} users before errors occurred`);
        }
        
        throw error;
    } finally {
        // Close database connection
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the script
bulkInsertUsers()
    .then(() => {
        console.log('\n✨ Bulk insert completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Bulk insert failed:', error);
        process.exit(1);
    });

