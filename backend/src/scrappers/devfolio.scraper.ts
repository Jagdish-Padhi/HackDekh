import axios from "axios";
import hackathon from "../models/hackathon.model.ts";
import * as cheerio from "cheerio";
import { universalFormatter } from "../formatters/universalFormatter.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ApiResponse } from "../utils/apiResponse.ts";
import { ApiError } from "../utils/apiError.ts";

const DEVFOLIO_LIST_URL = "https://devfolio.co/hackathons";
const DEVFOLIO_DETAIL_CONCURRENCY = 5;

const parseNextData = (html: string): any => {
  const $ = cheerio.load(html);
  const rawJson = $("#__NEXT_DATA__").html();

  if (!rawJson) {
    throw new Error("No Hackathons found...");
  }

  return JSON.parse(rawJson);
};

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const getDetailOverviewData = async (slug: string): Promise<any | null> => {
  if (!slug) {
    return null;
  }

  const detailUrl = `https://${slug}.devfolio.co/overview`;
  const html = await axios.get(detailUrl, { timeout: 15000 });
  const json = parseNextData(html.data);
  return json?.props?.pageProps ?? null;
};

const enrichSingleDevfolioHackathon = async (hack: any): Promise<any> => {
  const slug = normalizeString(hack?.slug);
  if (!slug) {
    return hack;
  }

  try {
    const pageProps = await getDetailOverviewData(slug);
    if (!pageProps) {
      return hack;
    }

    const detailHackathon = pageProps?.hackathon ?? {};
    const detailCoverImage =
      normalizeString(detailHackathon?.cover_img) ||
      normalizeString(detailHackathon?.settings?.featured_cover_img_v2) ||
      normalizeString(detailHackathon?.settings?.featured_cover_img) ||
      null;

    const aggregatePrizeValue =
      typeof pageProps?.aggregatePrizeValue === "number" &&
      Number.isFinite(pageProps.aggregatePrizeValue)
        ? pageProps.aggregatePrizeValue
        : null;

    const aggregatePrizeCurrency =
      normalizeString(pageProps?.aggregatePrizeCurrency) || null;

    const existingPrizeDetails = Array.isArray(hack?.prizeDetails)
      ? hack.prizeDetails
      : [];
    const fetchedPrizeDetails = Array.isArray(pageProps?.prizeDetails)
      ? pageProps.prizeDetails
      : [];

    return {
      ...hack,
      cover_img: hack?.cover_img ?? detailCoverImage,
      settings: {
        ...(hack?.settings ?? {}),
        featured_cover_img:
          hack?.settings?.featured_cover_img ?? detailCoverImage,
        featured_cover_img_v2:
          hack?.settings?.featured_cover_img_v2 ?? detailCoverImage,
      },
      aggregatePrizeValue: hack?.aggregatePrizeValue ?? aggregatePrizeValue,
      aggregatePrizeCurrency:
        hack?.aggregatePrizeCurrency ?? aggregatePrizeCurrency,
      prizeDetails: existingPrizeDetails.length
        ? existingPrizeDetails
        : fetchedPrizeDetails,
    };
  } catch (error: any) {
    console.warn(
      `[Devfolio] Detail enrichment failed for ${slug}: ${error?.message || error}`
    );
    return hack;
  }
};

const enrichDevfolioHackathons = async (hackathons: any[]): Promise<any[]> => {
  if (!hackathons.length) {
    return hackathons;
  }

  const enriched = [...hackathons];
  const workerCount = Math.min(DEVFOLIO_DETAIL_CONCURRENCY, hackathons.length);
  let index = 0;

  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const currentIndex = index;
      index += 1;

      if (currentIndex >= hackathons.length) {
        return;
      }

      enriched[currentIndex] = await enrichSingleDevfolioHackathon(
        hackathons[currentIndex]
      );
    }
  });

  await Promise.all(workers);
  return enriched;
};

//ATTEMPT 1: Tried to fetch from .json file in network tab but..
// its id was changing with time so not stable for long term

/* export const scrapeDevfolio = async (req: any, res: any) => {
   try {
1. fetch hackathons array raw data

    const URL = "https://devfolio.co/_next/data/JtO3J0dzXt3nDh-j8-16z/hackathons.json";
    const { data } = await axios.get(URL);
    const hackathons =
       data?.pageProps?.dehydratedState?.queries[0]?.state?.data
         ?.open_hackathons;

    if (!hackathons) {
       return res.status(400).json({ error: "No hackathons found..." });
     }

2. Pass Raw Data to universal formatter

     const normalizedList = universalFormatter(hackathons, "devfolio");

3. Save each hackathon in DB to avoid duplicate insert checking if hackathon
   already existing then update else insert using upsert true.

     for (const hack of normalizedList as any[]) {
       await hackathon.findOneAndUpdate(
         { slug: hack.slug, platform: hack.platform },
         { $set: hack },
         { upsert: true, new: true }
       );
    }
4. Return the data and result
     return res.json({ ok: true, count: normalizedList.length });
   } catch (error) {
     console.log("Devfolio Scraper Error: ", error);
     return res.status(500).json({ error: "Internal server error" });
   } */

//--------------------Hence It was not suitable for long term stability -----------------------------------

// ATTEMPT 2: Using cheerio extract html of main page and
// inside that fetch that hackathons json file in script tag

export const scrapeDevfolio = asyncHandler(async (req: any, res: any) => {
  try {
    const data = await scrapeDevfolioData();
    return res.status(200).json(new ApiResponse(200, { ok: true, count: data.length }, "Devfolio hackathons scraped successfully!"));
  } catch (error: any) {
    throw new ApiError(500, error.message || "Internal server error");
  }
});

export async function scrapeDevfolioData() {
  try {
    //1. Fetch HTML from main page
    const html = await axios.get(DEVFOLIO_LIST_URL, { timeout: 15000 });
    const json = parseNextData(html.data);
    const hackathons =
      json?.props?.pageProps?.dehydratedState?.queries[0]?.state?.data
        ?.open_hackathons || [];

    if (!hackathons || hackathons.length === 0) {
      throw new Error("No Hackathons found...");
    }

    // Devfolio list payload misses prize/image fields for many hackathons.
    // Enrich each card with overview-page data before formatting.
    const enrichedHackathons = await enrichDevfolioHackathons(hackathons);

    //2. Pass Raw Data to universal formatter
    const normalizedList = universalFormatter(enrichedHackathons, "devfolio");

    //3. Save each hackathon in DB.
    //To avoid duplicate insert checking if hackathon
    //already existing then update else insert using upsert true.
    for (const hack of normalizedList as any[]) {
      await hackathon.findOneAndUpdate(
        { slug: hack.slug, platform: hack.platform },
        { $set: hack },
        { upsert: true, new: true }
      );
    }
    return normalizedList;
  } catch (error) {
    console.log("Devfolio Scraper Error: ", error);
    throw error;
  }
}
