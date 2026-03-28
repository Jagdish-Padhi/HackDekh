import { Router } from "express";
import { scrapeDevfolio } from "../scrappers/devfolio.scraper.ts";
import { scrapeUnstop } from "../scrappers/unstop.scraper.ts";
import { runAllScrapers } from "../cron/runAllScrapers.ts";
import { getCronSecret } from "../constants.ts";

const router = Router();

router.route("/devfolio_scrape").get(scrapeDevfolio);
router.route("/unstop_scrape").get(scrapeUnstop);
router.route("/refresh").post(async (_req, res) => {
	await runAllScrapers();
	return res.status(200).json({ message: "Hackathons refreshed successfully" });
});

router.route("/cron/trigger").post(async (req, res) => {
	const secret = req.headers["x-cron-secret"];
	if (secret !== getCronSecret()) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	try {
		await runAllScrapers();
		return res.status(200).json({ message: "Cron job executed successfully", timestamp: new Date() });
	} catch (error) {
		return res.status(500).json({ error: "Cron job failed", details: String(error) });
	}
});

export default router;