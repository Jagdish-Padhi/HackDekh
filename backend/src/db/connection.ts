import mongoose from "mongoose";
import { DB_NAME } from "../constants.ts";

const connectDB = async (retries = 5, delay = 3000): Promise<void> => {
  for (let i = 1; i <= retries; i++) {
    try {
      console.log(`[DB] Connecting to MongoDB (Attempt ${i}/${retries})...`);
      await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
      console.log("[DB] MongoDB connected successfully");
      return;
    } catch (err: any) {
      console.error(`[DB] MongoDB connection attempt ${i} failed:`, err.message);
      if (i === retries) {
        console.error("[DB] All connection attempts failed. Exiting process.");
        process.exit(1);
      }
      console.log(`[DB] Retrying connection in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

export default connectDB;
