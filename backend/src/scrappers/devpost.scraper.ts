import axios from "axios";
import * as cheerio from "cheerio";
import hackathon from "../models/hackathon.model.ts";
import { universalFormatter } from "../formatters/universalFormatter.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ApiResponse } from "../utils/apiResponse.ts";
import { ApiError } from "../utils/apiError.ts";

const DEVPOST_API_URL = "https://devpost.com/api/hackathons";
const DEVPOST_DETAIL_CONCURRENCY = 10;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
};

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const enrichSingleDevpostHackathon = async (hack: any): Promise<any> => {
  const url = hack?.url;
  if (!url) return hack;

  try {
    const { data: html } = await axios.get(url, {
      headers: HEADERS,
      timeout: 15000,
    });

    const $ = cheerio.load(html);

    // --- Location: extract from the detail page sidebar ---
    const locationEl = $("#challenge-location, .location, [data-testid='location']");
    let detailLocation: string | null = null;
    if (locationEl.length) {
      detailLocation = normalizeString(locationEl.text());
    }
    // Also try meta tag or structured data
    if (!detailLocation) {
      $("meta[property='event:location:locality'], meta[name='location']").each((_i, el) => {
        if (!detailLocation) {
          detailLocation = normalizeString($(el).attr("content"));
        }
      });
    }

    // --- Description ---
    let detailDescription: string | null = null;
    const descEl = $("meta[property='og:description'], meta[name='description']");
    if (descEl.length) {
      detailDescription = normalizeString(descEl.first().attr("content"));
    }

    // --- Themes / Tags from the detail page ---
    const detailThemes: string[] = [];
    $(".challenge-themes .tag, .themes .pill, [data-role='theme']").each((_i, el) => {
      const text = normalizeString($(el).text());
      if (text && !detailThemes.includes(text)) {
        detailThemes.push(text);
      }
    });

    // --- Team Size from rules ---
    let detailTeamSize: string | null = null;
    const rulesText = $(".rules, #rules, .challenge-rules, .requirements").text().toLowerCase();
    const teamSizeMatch = rulesText.match(
      /(?:team\s*size|members?\s*per\s*team|participants?\s*per\s*team)[:\s]*(\d+)\s*[-–to]+\s*(\d+)/i
    );
    if (teamSizeMatch) {
      detailTeamSize = `${teamSizeMatch[1]}-${teamSizeMatch[2]}`;
    } else {
      const maxTeamMatch = rulesText.match(
        /(?:up\s*to|max(?:imum)?|at\s*most)\s*(\d+)\s*(?:members?|people|participants?|per\s*team)/i
      );
      if (maxTeamMatch) {
        detailTeamSize = `1-${maxTeamMatch[1]}`;
      }
    }

    // --- Organizer ---
    let detailOrganizer: string | null = null;
    const organizerEl = $(".host-label + .host-name, .host a, .organizer-name, [data-role='host-name']");
    if (organizerEl.length) {
      detailOrganizer = normalizeString(organizerEl.first().text());
    }

    // --- Timeline / Stages ---
    const detailStages: any[] = [];
    const datesEl = $(".important-dates, #important-dates, .sidebar-section .important-dates");
    if (datesEl.length) {
      datesEl.find("dt").each((_i, el) => {
        const title = normalizeString($(el).text());
        const descEl = $(el).next("dd");
        if (title && descEl.length) {
          const dateText = normalizeString(descEl.text());
          const timeTag = descEl.find("time");
          const isoDate = timeTag.attr("datetime") || dateText;
          if (isoDate) {
            const parsed = new Date(isoDate);
            if (!isNaN(parsed.getTime())) {
              detailStages.push({
                name: title,
                deadline: parsed,
              });
            }
          }
        }
      });
    }

    if (detailStages.length === 0) {
      if (hack?.submission_deadline) {
        detailStages.push({ name: "Submission Deadline", deadline: new Date(hack.submission_deadline) });
      }
      if (hack?.start_date) {
        detailStages.push({ name: "Hackathon Start", deadline: new Date(hack.start_date) });
      }
      if (hack?.deadline) {
        detailStages.push({ name: "Winners Announced", deadline: new Date(hack.deadline) });
      }
    }

    return {
      ...hack,
      _stages: detailStages.length > 0 ? detailStages : null,
      _enriched_location: detailLocation || null,
      _enriched_description: detailDescription || null,
      _enriched_themes: detailThemes.length > 0 ? detailThemes : null,
      _enriched_teamSize: detailTeamSize || null,
      _enriched_organizer: detailOrganizer || null,
    };
  } catch (error: any) {
    console.warn(
      `[Devpost] Detail enrichment failed for ${url}: ${error?.message || error}`
    );
    return hack;
  }
};

const enrichDevpostHackathons = async (hackathons: any[]): Promise<any[]> => {
  if (!hackathons.length) return hackathons;

  const enriched = [...hackathons];
  const workerCount = Math.min(DEVPOST_DETAIL_CONCURRENCY, hackathons.length);
  let index = 0;

  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const currentIndex = index;
      index += 1;
      if (currentIndex >= hackathons.length) return;

      enriched[currentIndex] = await enrichSingleDevpostHackathon(hackathons[currentIndex]);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  });

  await Promise.all(workers);
  return enriched;
};

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
    let allHackathons: any[] = [];
    
    for (let page = 1; page <= 2; page++) {
      const response = await axios.get(DEVPOST_API_URL, {
        params: {
          "challenge_type[]": "online",
          "status[]": "open",
          page: page,
          per_page: 20
        },
        headers: HEADERS,
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

    console.log(`[Devpost Scraper] Fetched ${allHackathons.length} hackathons. Enriching from detail pages...`);
    const enrichedHackathons = await enrichDevpostHackathons(allHackathons);

    console.log(`[Devpost Scraper] Enrichment complete. Formatting...`);
    const normalizedList = universalFormatter(enrichedHackathons, "devpost");

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
