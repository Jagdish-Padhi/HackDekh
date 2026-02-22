import { Router } from "express";
import { scrapeDevfolio } from "../scrappers/devfolio.scraper.ts";
import { scrapeUnstop } from "../scrappers/unstop.scraper.ts";

const router = Router();

router.route("/devfolio_scrape").get(scrapeDevfolio);
router.route("/unstop_scrape").get(scrapeUnstop);

export default router;