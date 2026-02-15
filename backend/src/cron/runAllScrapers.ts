
import { scrapeDevfolioData } from "../scrappers/devfolio.scraper.ts";
import { scrapeUnstopData } from "../scrappers/unstop.scraper.ts";

export async function runAllScrapers() {
    try {
        await scrapeDevfolioData();
        await scrapeUnstopData();
    } catch (err) {
        console.error('[CRON] Error running scrapers: ', err);
    }
}