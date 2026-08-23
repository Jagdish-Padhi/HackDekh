import mongoose from "mongoose";
import { DB_NAME } from "../constants.ts";

const connectDB = async (retries = 5, delay = 3000): Promise<void> => {
  if (mongoose.connection.readyState === 1) return;
  const baseUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
  const uri = baseUri.includes(DB_NAME) || process.env.NODE_ENV === 'test' ? baseUri : `${baseUri}/${DB_NAME}`;

  for (let i = 1; i <= retries; i++) {
    try {
      await mongoose.connect(uri);
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
