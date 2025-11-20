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

// Read user data from User_data.txt
function loadUserData() {
    try {
        // User_data.txt is in the same directory as this script
        const dataPath = path.join(__dirname, 'User_data.txt');
        
        if (!fs.existsSync(dataPath)) {
            throw new Error(`User_data.txt file not found at: ${dataPath}`);
        }
        
        console.log(`📂 Reading data from: ${dataPath}`);
        const fileContent = fs.readFileSync(dataPath, 'utf8');
        const users = JSON.parse(fileContent);
        
        if (!Array.isArray(users)) {
            throw new Error('Data file must contain a JSON array');
        }
        
        console.log(`✅ Loaded ${users.length} users from User_data.txt`);
        return users;
    } catch (error) {
        console.error('❌ Error loading user data:', error.message);
        throw error;
    }
}

// Extract user IDs from MongoDB
async function extractUserIds() {
    try {
        // Connect to database
        await connectDB();
        
        // Load user data
        const users = loadUserData();
        
        console.log(`\n🔍 Querying MongoDB for ${users.length} users...`);
        
        const userIdMappings = [];
        const notFound = [];
        
        // Query each user by email
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            const email = user.email;
            
            try {
                const dbUser = await userModel.findOne({ email }).select('_id email name').lean();
                
                if (dbUser) {
                    userIdMappings.push({
                        email: dbUser.email,
                        userId: dbUser._id.toString(),
                        name: dbUser.name
                    });
                    console.log(`✅ [${i + 1}/${users.length}] Found: ${email} -> ${dbUser._id}`);
                } else {
                    notFound.push({
                        email: email,
                        name: user.name
                    });
                    console.log(`⚠️  [${i + 1}/${users.length}] Not found: ${email}`);
                }
            } catch (error) {
                console.error(`❌ Error querying user ${email}:`, error.message);
                notFound.push({
                    email: email,
                    name: user.name,
                    error: error.message
                });
            }
        }
        
        // Prepare output data
        const output = {
            totalUsers: users.length,
            found: userIdMappings.length,
            notFound: notFound.length,
            mappings: userIdMappings,
            notFoundUsers: notFound,
            generatedAt: new Date().toISOString()
        };
        
        // Save to userId.txt
        const outputPath = path.join(__dirname, 'userId.txt');
        const outputContent = JSON.stringify(output, null, 2);
        fs.writeFileSync(outputPath, outputContent);
        
        console.log(`\n📊 Summary:`);
        console.log(`   Total users in file: ${users.length}`);
        console.log(`   Found in database: ${userIdMappings.length}`);
        console.log(`   Not found: ${notFound.length}`);
        console.log(`\n✅ Results saved to: ${outputPath}`);
        
        if (notFound.length > 0) {
            console.log(`\n⚠️  Users not found in database:`);
            notFound.forEach(user => {
                console.log(`   - ${user.email} (${user.name})`);
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
extractUserIds()
    .then(() => {
        console.log('\n✨ User ID extraction completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 User ID extraction failed:', error);
        process.exit(1);
    });

