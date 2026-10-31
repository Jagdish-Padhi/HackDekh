import mongoose from "mongoose";
import { DB_NAME } from "../../shared/constants/constants.ts";

const connectDB = async (retries = 5, delay = 3000): Promise<void> => {
  if (mongoose.connection.readyState === 1) return;
  const baseUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017";

  for (let i = 1; i <= retries; i++) {
    try {
      await mongoose.connect(baseUri, {
        dbName: process.env.DB_NAME || DB_NAME,
      });
      console.log("[DB] MongoDB connected successfully");
      return;
    } catch (err: any) {
      console.error('[DB] MongoDB connection failed:', err.message);
      if (i === retries) {
        if (process.env.NODE_ENV !== 'test') process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

export default connectDB;