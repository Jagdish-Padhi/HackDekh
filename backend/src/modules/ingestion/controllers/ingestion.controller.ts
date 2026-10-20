import type { Request, Response } from "express";
import { runAllScrapers } from "../services/ingestion.service.ts";
import { scrapeDevfolioData } from "../providers/devfolio.provider.ts";
import { scrapeUnstopData } from "../providers/unstop.provider.ts";
import { scrapeDevpostData } from "../providers/devpost.provider.ts";
import { scrapeMLHData } from "../providers/mlh.provider.ts";
import { scrapeHack2SkillData } from "../providers/hack2skill.provider.ts";
import { getCronSecret } from "../../../shared/constants/constants.ts";
import { asyncHandler } from "../../../shared/utils/asyncHandler.ts";
import { ApiResponse } from "../../../shared/responses/apiResponse.ts";
import { ApiError } from "../../../shared/errors/apiError.ts";
let isCronJobRunning = false;

export const scrapeDevfolio = asyncHandler(async (req: Request, res: Response) => {
  const result = await scrapeDevfolioData();
  return res.status(200).json(new ApiResponse(200, result, "Devfolio hackathons scraped successfully!"));
});

export const scrapeUnstop = asyncHandler(async (req: Request, res: Response) => {
  const result = await scrapeUnstopData();
  return res.status(200).json(new ApiResponse(200, result, "Unstop hackathons scraped successfully!"));
});

export const scrapeDevpost = asyncHandler(async (req: Request, res: Response) => {
  const result = await scrapeDevpostData();
  return res.status(200).json(new ApiResponse(200, result, "Devpost hackathons scraped successfully!"));
});

export const scrapeMLH = asyncHandler(async (req: Request, res: Response) => {
  const result = await scrapeMLHData();
  return res.status(200).json(new ApiResponse(200, { ok: true, count: result.length }, "MLH hackathons scraped successfully!"));
});

export const scrapeHack2Skill = asyncHandler(async (req: Request, res: Response) => {
  const result = await scrapeHack2SkillData();
  return res.status(200).json(new ApiResponse(200, result, "Hack2Skill hackathons scraped successfully!"));
});

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
