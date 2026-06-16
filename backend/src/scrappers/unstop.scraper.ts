import axios, { AxiosError } from "axios";
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchOpportunityDetail(id: number): Promise<any | null> {
  try {
    const { data } = await axios.get(
      `https://unstop.com/api/public/competition/${id}?round_lang=1&getSaasFeatures=true`,
      {
        headers: HEADERS,
        timeout: 12000,
      }
    );
    return data?.data?.competition ?? null;
  } catch (err) {
    const status = (err as AxiosError)?.response?.status;
    console.error(`[Unstop Scraper] Error fetching detail for ID ${id}: HTTP ${status ?? "?"}`);
    return null;
  }
}

export const scrapeUnstop = asyncHandler(async (req: any, res: any) => {
  const data = await scrapeUnstopData();
  return res.status(200).json(new ApiResponse(200, { ok: true, count: data.length }, "Unstop hackathons scraped successfully!"));
});

export async function scrapeUnstopData() {

  let hackathons: any[] = [];
  let page: number = 1;
  let hasMoreData: boolean = true;

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

  console.log(`[Unstop Scraper] Fetched ${hackathons.length} hackathons (search results). Fetching deep details and rounds...`);

  // Enrich each hackathon with detail/round data in batches of 5
  const enrichedHackathons: any[] = [];
  const batchSize = 5;
  const totalItems = hackathons.length;

  for (let i = 0; i < totalItems; i += batchSize) {
    const batch = hackathons.slice(i, i + batchSize);
    console.log(`[Unstop Scraper] Detail batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(totalItems / batchSize)}...`);

    const enrichedBatch = await Promise.all(
      batch.map(async (h) => {
        const id = h.id;
        if (!id) {
          console.warn(`[Unstop Scraper] Item "${h.title}" has no id field — skipping detail fetch`);
          return h;
        }
        const detail = await fetchOpportunityDetail(id);
        if (detail) {
          return {
            ...h,
            opportunity_rounds: detail.rounds || [],
            details: detail.details || detail.description || h.details,
            cover_image: detail.logoUrl2 || detail.logoUrl || detail.cover_image || h.logoUrl2 || h.logoUrl,
          };
        }
        return h;
      })
    );
    enrichedHackathons.push(...enrichedBatch);
    if (i + batchSize < totalItems) {
      await sleep(1000);
    }
  }

  console.log(`[Unstop Scraper] Enrichment done. Formatting...`);

  //Normalize the raw data
  const normalizedList = universalFormatter(enrichedHackathons, "unstop");

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
