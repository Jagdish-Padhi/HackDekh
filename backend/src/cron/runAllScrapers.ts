
import { scrapeDevfolioData } from "../scrappers/devfolio.scraper.ts";
import { scrapeUnstopData } from "../scrappers/unstop.scraper.ts";
import { scrapeDevpostData } from "../scrappers/devpost.scraper.ts";
import { scrapeMLHData } from "../scrappers/mlh.scraper.ts";
import { scrapeHack2SkillData } from "../scrappers/hack2skill.scraper.ts";

export async function runAllScrapers() {
    console.log('[CRON] Starting all scrapers...');
    const scrapers = [
        { name: 'Devfolio', run: scrapeDevfolioData },
        { name: 'Unstop', run: scrapeUnstopData },
        { name: 'Devpost', run: scrapeDevpostData },
        { name: 'MLH', run: scrapeMLHData },
        { name: 'Hack2Skill', run: scrapeHack2SkillData }
    ];

    for (const scraper of scrapers) {
        try {
            console.log(`[CRON] Starting ${scraper.name} scraper...`);
            await scraper.run();
            console.log(`[CRON] ${scraper.name} scraper completed successfully.`);
        } catch (err: any) {
            console.error(`[CRON] ${scraper.name} scraper failed:`, err?.message || err);
        }
    }
    console.log('[CRON] All scrapers processed.');
}