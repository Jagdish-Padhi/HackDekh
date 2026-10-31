import { scrapeDevfolioData } from "../adapters/devfolio.adapter.ts";
import { scrapeUnstopData } from "../adapters/unstop.adapter.ts";
import { scrapeDevpostData } from "../adapters/devpost.adapter.ts";
import { scrapeMLHData } from "../adapters/mlh.adapter.ts";
import { scrapeHack2SkillData } from "../adapters/hack2skill.adapter.ts";
import { invalidateHackathonCache } from "../../../infrastructure/cache/redis.ts";

export interface IngestionRunSummary {
  total: number;
  successful: number;
  failed: number;
  results: Array<{ name: string; status: "success" | "failed"; error?: string }>;
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
      await scraper.run();
      successfulScrapers++;
      results.push({ name: scraper.name, status: "success" });
      console.log(`[CRON] ${scraper.name} scraper completed successfully.`);
    } catch (err: any) {
      console.error(`[CRON] ${scraper.name} scraper failed:`, err?.message || err);
      results.push({ name: scraper.name, status: "failed", error: err?.message || String(err) });
    }
  }

  console.log("[CRON] All scrapers processed.");

  if (successfulScrapers > 0) {
    await invalidateHackathonCache();
  }

  return {
    total: scrapers.length,
    successful: successfulScrapers,
    failed: scrapers.length - successfulScrapers,
    results,
  };
}
