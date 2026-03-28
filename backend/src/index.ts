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

connectDB().then(() => {
  logEmailDeliveryStatus();
  app.listen(process.env.PORT || 8000, () => {
    console.log(`Server is running at PORT: ${process.env.PORT}`);
  });
});
