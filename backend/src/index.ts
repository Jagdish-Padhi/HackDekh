import "dotenv/config";
import { connectDB, connectRedis, isEmailDeliveryConfigured } from "./infrastructure/index.ts";
import { app } from "./app.ts";

const logEmailDeliveryStatus = () => {
  const configured = isEmailDeliveryConfigured();
  console.log(`[Startup] Email delivery configured: ${configured ? "YES" : "NO"}`);
  if (!configured) {
    console.warn(
      "[Startup] SMTP not fully configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM in backend .env"
    );
  }
};

const serverPort = process.env.PORT || 8000;
app.listen(serverPort, () => {
  console.log(`Server is running at PORT: ${serverPort}`);
});

connectRedis()
  .then(() => {
    console.log("[Startup] Redis connected successfully!");
  })
  .catch((err: any) => {
    console.error("[Startup] Redis connection failed:", err.message);
  });

connectDB()
  .then(() => {
    logEmailDeliveryStatus();
  })
  .catch((err: any) => {
    console.error("[Startup] Background DB connection failed:", err.message);
  });
