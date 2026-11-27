import { scrapeDevfolioData } from "../adapters/devfolio.adapter.ts";
import { scrapeUnstopData } from "../adapters/unstop.adapter.ts";
import { scrapeDevpostData } from "../adapters/devpost.adapter.ts";
import { scrapeMLHData } from "../adapters/mlh.adapter.ts";
import { scrapeHack2SkillData } from "../adapters/hack2skill.adapter.ts";
import { invalidateHackathonCache } from "../../../infrastructure/cache/redis.ts";
import { sendScraperHealthAlert } from "../../../infrastructure/notifications/alert.service.ts";

export interface IngestionRunSummary {
  total: number;
  successful: number;
  failed: number;
  results: Array<{ name: string; status: "success" | "failed"; count: number; error?: string }>;
}

export async function runAllScrapers(): Promise<IngestionRunSummary> {
  console.log("[CRON] Starting all scrapers...");

  const scrapers = [
    { name: "Devfolio", run: scrapeDevfolioData },
    { name: "Unstop", run: scrapeUnstopData },
    { name: "Devpost", run: scrapeDevpostData },
    { name: "MLH", run: scrapeMLHData },
    { name: "Hack2Skill", run: scrapeHack2SkillData },
  ];

  const results: IngestionRunSummary["results"] = [];
  let successfulScrapers = 0;

  for (const scraper of scrapers) {
    try {
      console.log(`[CRON] Starting ${scraper.name} scraper...`);
      const items = await scraper.run();
      const count = Array.isArray(items) ? items.length : 0;
      successfulScrapers++;
      results.push({ name: scraper.name, status: "success", count });
      console.log(`[CRON] ${scraper.name} scraper completed (${count} items).`);
    } catch (err: any) {
      console.error(`[CRON] ${scraper.name} scraper failed:`, err?.message || err);
      results.push({ name: scraper.name, status: "failed", count: 0, error: err?.message || String(err) });
    }
  }

  console.log("[CRON] All scrapers processed.");

  if (successfulScrapers > 0) {
    await invalidateHackathonCache();
  }

  const summary: IngestionRunSummary = {
    total: scrapers.length,
    successful: successfulScrapers,
    failed: scrapers.length - successfulScrapers,
    results,
  };

  await sendScraperHealthAlert(summary);

  return summary;
}
