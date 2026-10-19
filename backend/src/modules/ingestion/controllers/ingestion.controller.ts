import type { Request, Response } from "express";
import { runAllScrapers } from "../services/ingestion.service.ts";
import { getCronSecret } from "../../../shared/constants/constants.ts";

let isCronJobRunning = false;

export const refreshHackathons = async (req: Request, res: Response) => {
  const secret = req.headers["x-cron-secret"];
  if (secret !== getCronSecret()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await runAllScrapers();
  return res.status(200).json({ message: "Hackathons refreshed successfully" });
};

export const triggerScraperCron = async (req: Request, res: Response) => {
  const secret = req.headers["x-cron-secret"];
  if (secret !== getCronSecret()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (isCronJobRunning) {
    return res.status(200).json({
      message: "Cron job already running",
      timestamp: new Date(),
    });
  }

  isCronJobRunning = true;
  void runAllScrapers()
    .catch((error) => {
      console.error("[CRON] Trigger route background run failed:", error);
    })
    .finally(() => {
      isCronJobRunning = false;
    });

  return res.status(200).json({
    message: "Cron job accepted and started",
    timestamp: new Date(),
  });
};
