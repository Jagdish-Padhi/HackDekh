import axios from "axios";
import hackathon from "../models/hackathon.model.ts";
import * as cheerio from "cheerio";
import { universalFormatter } from "../formatters/universalFormatter.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ApiResponse } from "../utils/apiResponse.ts";
import { ApiError } from "../utils/apiError.ts";

const DEVFOLIO_LIST_URL = "https://devfolio.co/hackathons";
const DEVFOLIO_DETAIL_CONCURRENCY = 15;

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

const mergeUniqueThemes = (existing: unknown, incoming: string[]): string[] => {
  const existingArr = Array.isArray(existing) ? existing : [];
  const merged = [...existingArr];
  for (const theme of incoming) {
    if (typeof theme === "string" && theme.trim().length > 0) {
      const normalized = theme.trim();
      if (!merged.some((t: any) => typeof t === "string" && t.trim().toLowerCase() === normalized.toLowerCase())) {
        merged.push(normalized);
      }
    }
  }
  return merged;
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
    const detailSettings = detailHackathon?.settings ?? {};

    // --- Cover Image ---
    const detailCoverImage =
      normalizeString(detailHackathon?.cover_img) ||
      normalizeString(detailSettings?.featured_cover_img_v2) ||
      normalizeString(detailSettings?.featured_cover_img) ||
      null;

    // --- Prize Data ---
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

    // --- Location fields (THE KEY FIX for TBD locations) ---
    const detailLocation = normalizeString(detailSettings?.event_location)
      || normalizeString(detailSettings?.venue)
      || normalizeString(detailSettings?.address)
      || normalizeString(detailSettings?.location)
      || normalizeString(detailHackathon?.location)
      || normalizeString(detailHackathon?.venue)
      || normalizeString(detailHackathon?.address)
      || null;

    const detailCity = normalizeString(detailSettings?.city) || normalizeString(detailHackathon?.city) || null;
    const detailState = normalizeString(detailSettings?.state) || normalizeString(detailHackathon?.state) || null;
    const detailCountry = detailSettings?.country || detailHackathon?.country || null;

    // --- Organization ---
    const detailOrganization = normalizeString(detailSettings?.organization_name)
      || normalizeString(detailHackathon?.organization_name)
      || null;

    // --- Themes / Tags ---
    const detailThemes = Array.isArray(detailSettings?.themes) ? detailSettings.themes : [];

    // --- Team Size ---
    const detailMinTeam = detailSettings?.min_team_size ?? detailHackathon?.min_team_size ?? null;
    const detailMaxTeam = detailSettings?.max_team_size ?? detailHackathon?.max_team_size ?? null;

    // --- Mode (online/offline) ---
    const detailIsOnline = detailHackathon?.is_online ?? null;

    // --- Dates ---
    const detailStartsAt = normalizeString(detailHackathon?.starts_at) || null;
    const detailRegEndsAt = normalizeString(detailSettings?.reg_ends_at) || null;

    // --- Description ---
    const detailDescription = normalizeString(detailHackathon?.desc)
      || normalizeString(detailHackathon?.description)
      || normalizeString(detailSettings?.desc)
      || null;

    // --- Geographies ---
    const detailGeographies = Array.isArray(detailSettings?.geographies)
      ? detailSettings.geographies
      : (Array.isArray(detailHackathon?.geographies) ? detailHackathon.geographies : null);

    // --- Extract Stages ---
    const detailStages: any[] = [];
    if (Array.isArray(detailHackathon?.phases)) {
      for (const phase of detailHackathon.phases) {
        if (phase.name) {
          detailStages.push({
            name: phase.name,
            deadline: phase.end_at ? new Date(phase.end_at) : undefined,
          });
        }
      }
    }
    if (detailStages.length === 0 && Array.isArray(detailHackathon?.schedule)) {
      for (const item of detailHackathon.schedule) {
        if (item.title) {
          detailStages.push({
            name: item.title,
            deadline: item.start_time ? new Date(item.start_time) : undefined,
          });
        }
      }
    }
    if (detailStages.length === 0 && Array.isArray(detailHackathon?.timeline)) {
      for (const item of detailHackathon.timeline) {
        if (item.title || item.name) {
          detailStages.push({
            name: item.title || item.name,
            deadline: item.date || item.end_time || item.start_time ? new Date(item.date || item.end_time || item.start_time) : undefined,
          });
        }
      }
    }
    if (detailStages.length === 0) {
      const regEnds = detailRegEndsAt || detailHackathon?.reg_ends_at;
      if (regEnds) {
        detailStages.push({ name: "Registration Deadline", deadline: new Date(regEnds) });
      }
      if (detailStartsAt) {
        detailStages.push({ name: "Hackathon Starts", deadline: new Date(detailStartsAt) });
      }
      if (detailHackathon?.ends_at) {
        detailStages.push({ name: "Hackathon Ends / Submission", deadline: new Date(detailHackathon.ends_at) });
      }
    }

    return {
      ...hack,
      _stages: detailStages,
      // Cover image
      cover_img: hack?.cover_img ?? detailCoverImage,
      settings: {
        ...(hack?.settings ?? {}),
        featured_cover_img:
          hack?.settings?.featured_cover_img ?? detailCoverImage,
        featured_cover_img_v2:
          hack?.settings?.featured_cover_img_v2 ?? detailCoverImage,
        // Merge location fields from detail into settings
        event_location: hack?.settings?.event_location ?? detailSettings?.event_location ?? null,
        venue: hack?.settings?.venue ?? detailSettings?.venue ?? null,
        address: hack?.settings?.address ?? detailSettings?.address ?? null,
        location: hack?.settings?.location ?? detailSettings?.location ?? null,
        city: hack?.settings?.city ?? detailSettings?.city ?? null,
        state: hack?.settings?.state ?? detailSettings?.state ?? null,
        country: hack?.settings?.country ?? detailSettings?.country ?? null,
        geographies: hack?.settings?.geographies ?? detailGeographies ?? null,
        // Organization
        organization_name: hack?.settings?.organization_name ?? detailOrganization ?? null,
        // Themes — merge unique
        themes: mergeUniqueThemes(hack?.settings?.themes, detailThemes),
        // Team size
        min_team_size: hack?.settings?.min_team_size ?? detailMinTeam,
        max_team_size: hack?.settings?.max_team_size ?? detailMaxTeam,
        // Deadline
        reg_ends_at: hack?.settings?.reg_ends_at ?? detailRegEndsAt,
      },
      // Top-level location fields from detail
      location: hack?.location ?? detailLocation,
      venue: hack?.venue ?? normalizeString(detailHackathon?.venue),
      address: hack?.address ?? normalizeString(detailHackathon?.address),
      city: hack?.city ?? detailCity,
      state: hack?.state ?? detailState,
      country: hack?.country ?? detailCountry,
      geographies: hack?.geographies ?? detailGeographies,
      // Mode
      is_online: hack?.is_online ?? detailIsOnline,
      // Organization
      organization_name: hack?.organization_name ?? detailOrganization,
      // Dates
      starts_at: hack?.starts_at ?? detailStartsAt,
      // Description
      desc: hack?.desc ?? detailDescription,
      // Team size at top level too
      min_team_size: hack?.min_team_size ?? detailMinTeam,
      max_team_size: hack?.max_team_size ?? detailMaxTeam,
      // Prize
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
    console.log(`[Devfolio Scraper] Fetching lists...`);
    const html = await axios.get(DEVFOLIO_LIST_URL, { timeout: 15000 });
    const json = parseNextData(html.data);
    const hackathons =
      json?.props?.pageProps?.dehydratedState?.queries[0]?.state?.data
        ?.open_hackathons || [];

    if (!hackathons || hackathons.length === 0) {
      throw new Error("No Hackathons found...");
    }

    console.log(`[Devfolio Scraper] Found ${hackathons.length} open hackathons. Enriching details & images...`);
    const enrichedHackathons = await enrichDevfolioHackathons(hackathons);

    console.log(`[Devfolio Scraper] Enrichment completed. Formatting...`);
    const normalizedList = universalFormatter(enrichedHackathons, "devfolio");

    console.log(`[Devfolio Scraper] Upserting ${normalizedList.length} items to database...`);
    let upsertCount = 0;
    for (const hack of normalizedList as any[]) {
      await hackathon.findOneAndUpdate(
        { slug: hack.slug, platform: hack.platform },
        { $set: hack },
        { upsert: true, returnDocument: 'after' }
      );
      upsertCount++;
    }
    console.log(`[Devfolio Scraper] Successfully upserted ${upsertCount} Devfolio hackathons.`);
    return normalizedList;
  } catch (error) {
    console.error("[Devfolio Scraper Error] Failed:", error);
    throw error;
  }
}
