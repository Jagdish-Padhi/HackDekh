import axios from "axios";
import hackathon from "../models/hackathon.model.ts";
import { universalFormatter } from "../formatters/universalFormatter.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ApiResponse } from "../utils/apiResponse.ts";
import { ApiError } from "../utils/apiError.ts";

const MLH_EVENTS_URL = "https://mlh.io/seasons/2026/events";

function decodeEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&rsquo;/g, "'")
    .replace(/&nbsp;/g, " ");
}

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
    const response = await axios.get(MLH_EVENTS_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      timeout: 15000
    });

    const html = response.data;
    const appIndex = html.indexOf('id="app"');
    if (appIndex === -1) {
      throw new Error("Could not find element with id='app' on MLH page.");
    }

    const dataPageStart = html.indexOf('data-page="', appIndex);
    if (dataPageStart === -1) {
      throw new Error("Could not find 'data-page' attribute on MLH page.");
    }

    const startOfJson = dataPageStart + 'data-page="'.length;
    let endOfJson = startOfJson;
    while (endOfJson < html.length) {
      if (html[endOfJson] === '"' && html.slice(endOfJson - 6, endOfJson) !== "&quot;") {
        break;
      }
      endOfJson++;
    }

    const rawJson = html.slice(startOfJson, endOfJson);
    const decodedJson = decodeEntities(rawJson);
    const parsedData = JSON.parse(decodedJson);

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
