import mongoose from "mongoose";

/**
 * Clean MongoDB URI by removing deprecated options from query string
 * @param {string} uri - MongoDB connection URI
 * @returns {string} - Cleaned URI without deprecated options
 */
const cleanMongoUri = (uri) => {
    if (!uri) return uri;
    
    try {
        const url = new URL(uri);
        const params = new URLSearchParams(url.search);
        
        // Remove deprecated options
        const deprecatedOptions = ['buffermaxentries', 'bufferMaxEntries'];
        deprecatedOptions.forEach(option => {
            if (params.has(option)) {
                params.delete(option);
            }
        });
        
        // Reconstruct URI
        url.search = params.toString();
        return url.toString();
    } catch (error) {
        // If URI parsing fails, return original (might be a connection string format)
        return uri;
    }
};

const connectDB = async () => {
    try {
        // Check if already connected
        if (mongoose.connection.readyState === 1) {
            console.log("✅ Database already connected");
            return;
        }

        // Set up connection event handlers
        mongoose.connection.on('connected', () => console.log("✅ Database Connected"));
        mongoose.connection.on('error', (err) => console.error('❌ MongoDB connection error:', err.message));
        mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));
        mongoose.connection.once('open', () => console.log('✅ MongoDB connection opened'));

        // Connect with proper options to prevent buffering timeout
        let mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MONGO_URI environment variable is not set');
        }
        
        // Clean URI to remove deprecated options
        mongoUri = cleanMongoUri(mongoUri);

        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 10000, // 10 seconds timeout
            socketTimeoutMS: 45000, // 45 seconds socket timeout
            bufferCommands: false, // Disable mongoose buffering
            maxPoolSize: 10, // Maintain up to 10 socket connections
            minPoolSize: 2, // Maintain at least 2 socket connections
        });

        console.log('✅ MongoDB connection established successfully');
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error.message);
        throw error; // Re-throw to allow caller to handle
    }
}

// Helper function to check if database is connected
export const isDBConnected = () => {
    return mongoose.connection.readyState === 1;
}

// Helper function to wait for database connection
export const waitForDBConnection = async (maxWaitTime = 30000) => {
    const startTime = Date.now();
    
    // If already connected, return immediately
    if (mongoose.connection.readyState === 1) {
        return true;
    }
    
    // Try to reconnect if connection is lost
    if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
        try {
            let mongoUri = process.env.MONGO_URI;
            if (!mongoUri) {
                throw new Error('MONGO_URI environment variable is not set');
            }
            
            // Clean URI to remove deprecated options
            mongoUri = cleanMongoUri(mongoUri);
            
            // Attempt to reconnect
            await mongoose.connect(mongoUri, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                bufferCommands: false,
                maxPoolSize: 10,
                minPoolSize: 2,
            });
            
            // Wait a moment for connection to establish
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error('Reconnection attempt failed:', error.message);
        }
    }
    
    // Wait for connection to be ready
    while (mongoose.connection.readyState !== 1) {
        if (Date.now() - startTime > maxWaitTime) {
            throw new Error('Database connection timeout');
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    return true;
}

export default connectDB;