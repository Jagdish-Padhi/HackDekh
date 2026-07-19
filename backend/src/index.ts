import dotenv from "dotenv";
dotenv.config();
import connectDB from "./db/connection.ts";
import { app } from "./app.ts";
import { isEmailDeliveryConfigured } from "./utils/email.ts";

const logEmailDeliveryStatus = () => {
  const configured = isEmailDeliveryConfigured();
  console.log(`[Startup] Email delivery configured: ${configured ? "YES" : "NO"}`);
  if (!configured) {
    console.warn(
      "[Startup] SMTP not fully configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM in backend .env"
    );
  }
};

// Start the Express server listening immediately to avoid cold start port binding timeout issues
const serverPort = process.env.PORT || 8000;
app.listen(serverPort, () => {
  console.log(`Server is running at PORT: ${serverPort}`);
});

// Initialize database connection asynchronously in the background
connectDB()
  .then(() => {
    logEmailDeliveryStatus();
  })
  .catch((err) => {
    console.error("[Startup] Background DB connection failed:", err.message);
  });
