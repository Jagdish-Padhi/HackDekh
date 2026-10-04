import { Router } from "express";
import { scrapeDevfolio } from "../scrappers/devfolio.scraper.ts";
import { scrapeUnstop } from "../scrappers/unstop.scraper.ts";
import { scrapeDevpost } from "../scrappers/devpost.scraper.ts";
import { scrapeMLH } from "../scrappers/mlh.scraper.ts";
import { scrapeHack2Skill } from "../scrappers/hack2skill.scraper.ts";
import { runAllScrapers } from "../cron/runAllScrapers.ts";
import { getCronSecret } from "../constants.ts";
import { scraperRateLimiter } from "../middlewares/rateLimiter.ts";

const router = Router();
let isCronJobRunning = false;

router.route("/devfolio_scrape").get(scraperRateLimiter, scrapeDevfolio);
router.route("/unstop_scrape").get(scraperRateLimiter, scrapeUnstop);
router.route("/devpost_scrape").get(scraperRateLimiter, scrapeDevpost);
router.route("/mlh_scrape").get(scraperRateLimiter, scrapeMLH);
router.route("/hack2skill_scrape").get(scraperRateLimiter, scrapeHack2Skill);

router.route("/refresh").post(scraperRateLimiter, async (req, res) => {
	const secret = req.headers["x-cron-secret"];
	if (secret !== getCronSecret()) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	await runAllScrapers();
	return res.status(200).json({ message: "Hackathons refreshed successfully" });
});

router.route("/cron/trigger").post(scraperRateLimiter, async (req, res) => {
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
});
export default router;
