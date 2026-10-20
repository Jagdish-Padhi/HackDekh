import { Router } from "express";
import {
  scrapeDevfolio,
  scrapeUnstop,
  scrapeDevpost,
  scrapeMLH,
  scrapeHack2Skill,
  refreshHackathons,
  triggerScraperCron,
} from "../controllers/ingestion.controller.ts";
import { scraperRateLimiter } from "../../../shared/middlewares/rateLimiter.ts";

const router = Router();

router.route("/devfolio_scrape").get(scraperRateLimiter, scrapeDevfolio);
router.route("/unstop_scrape").get(scraperRateLimiter, scrapeUnstop);
router.route("/devpost_scrape").get(scraperRateLimiter, scrapeDevpost);
router.route("/mlh_scrape").get(scraperRateLimiter, scrapeMLH);
router.route("/hack2skill_scrape").get(scraperRateLimiter, scrapeHack2Skill);

router.route("/refresh").post(scraperRateLimiter, refreshHackathons);
router.route("/cron/trigger").post(scraperRateLimiter, triggerScraperCron);

export default router;
