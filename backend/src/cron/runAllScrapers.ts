
import { scrapeDevfolioData } from "../scrappers/devfolio.scraper.ts";
import { scrapeUnstopData } from "../scrappers/unstop.scraper.ts";
import { scrapeDevpostData } from "../scrappers/devpost.scraper.ts";
import { scrapeMLHData } from "../scrappers/mlh.scraper.ts";
import { scrapeHack2SkillData } from "../scrappers/hack2skill.scraper.ts";

export async function runAllScrapers() {
    try {
        console.log('[CRON] Starting all scrapers...');
        await scrapeDevfolioData();
        await scrapeUnstopData();
        await scrapeDevpostData();
        await scrapeMLHData();
        await scrapeHack2SkillData();
        console.log('[CRON] All scrapers completed successfully.');
    } catch (err) {
        console.error('[CRON] Error running scrapers: ', err);
    }
}