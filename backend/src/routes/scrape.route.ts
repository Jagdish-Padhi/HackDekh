import { Router } from "express";
import { scrapeDevfolio } from "../scrappers/devfolio.scraper.ts";
import { scrapeUnstop } from "../scrappers/unstop.scraper.ts";
import { scrapeDevpost } from "../scrappers/devpost.scraper.ts";
import { scrapeMLH } from "../scrappers/mlh.scraper.ts";
import { scrapeHack2Skill } from "../scrappers/hack2skill.scraper.ts";
import { runAllScrapers } from "../cron/runAllScrapers.ts";
import { getCronSecret } from "../constants.ts";

const router = Router();
let isCronJobRunning = false;

router.route("/devfolio_scrape").get(scrapeDevfolio);
router.route("/unstop_scrape").get(scrapeUnstop);
router.route("/devpost_scrape").get(scrapeDevpost);
router.route("/mlh_scrape").get(scrapeMLH);
router.route("/hack2skill_scrape").get(scrapeHack2Skill);
router.route("/refresh").post(async (_req, res) => {
	await runAllScrapers();
	return res.status(200).json({ message: "Hackathons refreshed successfully" });
});

router.route("/cron/trigger").post(async (req, res) => {
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