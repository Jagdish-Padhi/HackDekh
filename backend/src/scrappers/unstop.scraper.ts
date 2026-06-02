import axios from "axios";
import hackathon from "../models/hackathon.model.ts";
import * as cheerio from "cheerio";
import { universalFormatter } from "../formatters/universalFormatter.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ApiResponse } from "../utils/apiResponse.ts";
import { ApiError } from "../utils/apiError.ts";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  Referer: "https://unstop.com/hackathons",
  Origin: "https://unstop.com",
};

export const scrapeUnstop = asyncHandler(async (req: any, res: any) => {
  const data = await scrapeUnstopData();
  return res.status(200).json(new ApiResponse(200, { ok: true, count: data.length }, "Unstop hackathons scraped successfully!"));
});

export async function scrapeUnstopData() {

  let hackathons: any[] = [];
  let page: number = 1;
  let hasMoreData: boolean = true;

  // The search API already returns ALL detail data per hackathon including:
  // regnRequirements (team size, deadline), prizes, address_with_country_logo,
  // details (HTML description), organisation, filters, required_skills, etc.
  // No separate detail API call needed — the search endpoint IS the deep data source.

  while (hasMoreData) {
    console.log(`fetching page No. ${page}...`);

    const { data: apiData } = await axios.get(
      "https://unstop.com/api/public/opportunity/search-result",
      {
        params: {
          opportunity: "hackathons",
          page: page,
          per_page: 20,
          oppstatus: "open",
        },
        headers: HEADERS,
      }
    );

    const currentBatch = apiData?.data?.data || [];

    //1. If batch is empty then scraped all pages
    if (currentBatch.length === 0) {
      hasMoreData = false;
      break;
    }

    //Otherwise all to main list of hackathons
    hackathons = [...hackathons, ...currentBatch];

    //Go to next page for search
    page++;

    //wait 1 sec between pages so that they don't ban me
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(`[Unstop Scraper] Fetched ${hackathons.length} hackathons (all detail data included from search API). Formatting...`);

  //Normalize the raw data
  const normalizedList = universalFormatter(hackathons, "unstop");

  // IMPORTANT CHALLENGE (Handling Duplicates): Remove duplicates from array
  const uniqueHackathons = normalizedList.filter(
    (hack: any, idx: any, self: any) =>
      idx ===
      self.findIndex(
        (t: any) => t.slug === hack.slug && t.platform === hack.platform
      )
  );

  //save in the DB
  console.log(`[Unstop Scraper] Saving ${uniqueHackathons.length} unique hackathons to DB...`);
  let saveCount = 0;
  for (const hack of uniqueHackathons as any[]) {
    try {
      await hackathon.findOneAndUpdate(
        {
          slug: hack.slug,
          platform: hack.platform,
        },
        { $set: hack },
        { upsert: true, returnDocument: 'after' }
      );
      saveCount++;
    } catch (err: any) {
      if (err.code === 11000) {
        console.log(`[Unstop Scraper] Skipped duplicate hackathon: ${hack.slug}`);
      } else {
        console.error(`[Unstop Scraper] DB Error for ${hack.slug}: `, err);
      }
    }
  }
  console.log(`[Unstop Scraper] Successfully saved ${saveCount} Unstop hackathons.`);

  return normalizedList;
}
