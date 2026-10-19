import express from "express";
import cors from "cors";
import { globalErrorHandler } from "./shared/errors/globalErrorHandler.ts";
import { apiRateLimiter } from "./shared/middlewares/rateLimiter.ts";
import { hackathonRouter } from "./modules/catalog/index.ts";
import { ingestionRouter } from "./modules/ingestion/index.ts";
import { teamRouter } from "./modules/team/index.ts";
import { userRouter } from "./modules/identity/index.ts";
import "./infrastructure/scheduler/scrapeScheduler.ts";

const app = express();

app.set("trust proxy", 1);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cors());

app.use("/api", apiRateLimiter);

app.use("/api/v1/scrape", ingestionRouter);
app.use("/api/v1/hackathons", hackathonRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/teams", teamRouter);

app.get("/api/v1/ping", (req, res) => {
  res.status(200).json({ success: true, message: "pong" });
});

app.use(globalErrorHandler);

export { app };
