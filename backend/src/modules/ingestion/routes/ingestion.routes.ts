import { Router } from "express";
import { scrapeDevfolio } from "../adapters/devfolio.adapter.ts";
import { scrapeUnstop } from "../adapters/unstop.adapter.ts";
import { scrapeDevpost } from "../adapters/devpost.adapter.ts";
import { scrapeMLH } from "../adapters/mlh.adapter.ts";
import { scrapeHack2Skill } from "../adapters/hack2skill.adapter.ts";
import { refreshHackathons, triggerScraperCron } from "../controllers/ingestion.controller.ts";
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
