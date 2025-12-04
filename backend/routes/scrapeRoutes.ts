import { Router } from "express";
import { scrapeDevfolio } from "../controllers/devfolio.scraper.ts";


const router = Router();

router.route("/devfolio_scrape").get(scrapeDevfolio);

export default router;