import mongoose from "mongoose";

const connectDB = async () => {
    mongoose.connection.on('connected', ()=> console.log("Database Connected"));
    mongoose.connection.on('error', (err)=> console.error('MongoDB connection error:', err.message));
    mongoose.connection.once('open', ()=> console.log('MongoDB connection opened'));
    await mongoose.connect(process.env.MONGO_URI);
}


export default  connectDB;