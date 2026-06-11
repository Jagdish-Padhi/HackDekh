import axios from "axios";
import * as cheerio from "cheerio";
import hackathon from "../models/hackathon.model.ts";
import { universalFormatter } from "../formatters/universalFormatter.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ApiResponse } from "../utils/apiResponse.ts";
import { ApiError } from "../utils/apiError.ts";
import { axiosGetWithRetry } from "../utils/scraperUtils.ts";

const MLH_EVENTS_URL = "https://mlh.io/seasons/2026/events";

export const scrapeMLH = asyncHandler(async (req: any, res: any) => {
  try {
    const data = await scrapeMLHData();
    return res.status(200).json(new ApiResponse(200, { ok: true, count: data.length }, "MLH hackathons scraped successfully!"));
  } catch (error: any) {
    throw new ApiError(500, error.message || "Internal server error");
  }
});

export async function scrapeMLHData() {
  try {
    console.log("[MLH Scraper] Fetching HTML...");
    const response = await axiosGetWithRetry(MLH_EVENTS_URL, {
      timeout: 20000
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const scriptEl = $("script[data-page]");
    if (!scriptEl.length) {
      throw new Error("Could not find script element with data-page attribute on MLH page.");
    }

    const rawJson = scriptEl.text();
    const parsedData = JSON.parse(rawJson);

    const upcomingEvents = parsedData?.props?.upcomingEvents || [];
    const allEvents = upcomingEvents;

    if (allEvents.length === 0) {
      console.warn("[MLH Scraper] No upcoming events found in JSON.");
      return [];
    }

    console.log(`[MLH Scraper] Found ${allEvents.length} upcoming events. Formatting...`);
    const normalizedList = universalFormatter(allEvents, "mlh");

    console.log(`[MLH Scraper] Saving ${normalizedList.length} items to database...`);
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
        console.error(`[MLH DB Error] Failed to save slug ${hack.slug}:`, err.message);
      }
    }

    console.log(`[MLH Scraper] Successfully saved ${saveCount} MLH hackathons.`);
    return normalizedList;
  } catch (error) {
    console.error("[MLH Scraper Error] Failed:", error);
    throw error;
  }
}
