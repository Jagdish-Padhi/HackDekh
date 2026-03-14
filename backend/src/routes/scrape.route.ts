import { Router } from "express";
import { scrapeDevfolio } from "../scrappers/devfolio.scraper.ts";
import { scrapeUnstop } from "../scrappers/unstop.scraper.ts";
import { runAllScrapers } from "../cron/runAllScrapers.ts";

const router = Router();

router.route("/devfolio_scrape").get(scrapeDevfolio);
router.route("/unstop_scrape").get(scrapeUnstop);
router.route("/refresh").post(async (_req, res) => {
	await runAllScrapers();
	return res.status(200).json({ message: "Hackathons refreshed successfully" });
});

export default router;