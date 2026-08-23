import express from "express";
import cors from "cors";
import scrapperRoutes from "./routes/scrape.route.ts";
import hackathonRoutes from "./routes/hackathon.route.ts";
import userRoutes from "./routes/user.route.ts";
import teamRoutes from "./routes/team.route.ts";
import { globalErrorHandler } from "./utils/globalErrorHandler.ts";
import { apiRateLimiter } from "./middlewares/rateLimiter.ts";
import "./cron/scrapeScheduler.ts";

const app = express();

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cors());

app.use("/api", apiRateLimiter);

app.use("/api/v1/scrape", scrapperRoutes);
app.use("/api/v1/hackathons", hackathonRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/teams", teamRoutes);

app.get("/api/v1/ping", (req, res) => {
  res.status(200).json({ success: true, message: "pong" });
});

app.use(globalErrorHandler);

export { app };
