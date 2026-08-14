import { getDynamoDBClient } from "./dynamo.ts";
import { ensureTables } from "./initTables.ts";

const connectDB = async (retries = 5, delay = 3000): Promise<void> => {
  for (let i = 1; i <= retries; i++) {
    try {
      console.log(`[DB] Connecting to DynamoDB (Attempt ${i}/${retries})...`);
      getDynamoDBClient();
      await ensureTables();
      console.log("[DB] DynamoDB connected successfully");
      return;
    } catch (err: any) {
      console.error(`[DB] DynamoDB connection attempt ${i} failed:`, err.message);
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