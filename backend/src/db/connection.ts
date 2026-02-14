import mongoose from "mongoose";
import { DB_NAME } from "../constants.ts";

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
  } catch (err: any) {
    console.error("MongoDB connection error", err.message);
    process.exit(1);
  }
};

export default connectDB;
