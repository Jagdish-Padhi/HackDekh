import axios from "axios";
import hackathon from "../models/hackathon.model.ts";
import { universalFormatter } from "../formatters/universalFormatter.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ApiResponse } from "../utils/apiResponse.ts";
import { ApiError } from "../utils/apiError.ts";

const DEVPOST_API_URL = "https://devpost.com/api/hackathons";

export const scrapeDevpost = asyncHandler(async (req: any, res: any) => {
  try {
    const data = await scrapeDevpostData();
    return res.status(200).json(new ApiResponse(200, { ok: true, count: data.length }, "Devpost hackathons scraped successfully!"));
  } catch (error: any) {
    throw new ApiError(500, error.message || "Internal server error");
  }
});

export async function scrapeDevpostData() {
  try {
    console.log("[Devpost Scraper] Starting fetch...");
    // Fetch first 2 pages of open online hackathons to get a good batch (around 40 hackathons)
    let allHackathons: any[] = [];
    
    for (let page = 1; page <= 2; page++) {
      const response = await axios.get(DEVPOST_API_URL, {
        params: {
          "challenge_type[]": "online",
          "status[]": "open",
          page: page,
          per_page: 20
        },
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        timeout: 15000
      });
      
      const batch = response.data?.hackathons || [];
      if (batch.length === 0) {
        break;
      }
      allHackathons = [...allHackathons, ...batch];
      
      // Delay 1 second to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (allHackathons.length === 0) {
      console.warn("[Devpost Scraper] No hackathons fetched.");
      return [];
    }

    console.log(`[Devpost Scraper] Fetched ${allHackathons.length} hackathons. Formatting...`);
    const normalizedList = universalFormatter(allHackathons, "devpost");

    console.log(`[Devpost Scraper] Normalization done. Saving ${normalizedList.length} items to database...`);
    let saveCount = 0;
    for (const hack of normalizedList as any[]) {
      try {
        await hackathon.findOneAndUpdate(
          { slug: hack.slug, platform: hack.platform },
          { $set: hack },
          { upsert: true, returnDocument: 'after' }
        );
        saveCount++;
      } catch (err: any) {
        console.error(`[Devpost DB Error] Failed to save slug ${hack.slug}:`, err.message);
      }
    }

    console.log(`[Devpost Scraper] Successfully saved ${saveCount} Devpost hackathons.`);
    return normalizedList;
  } catch (error) {
    console.error("[Devpost Scraper Error] Failed:", error);
    throw error;
  }
}
