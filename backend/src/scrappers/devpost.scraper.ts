import axios from "axios";
import * as cheerio from "cheerio";
import hackathon from "../models/hackathon.model.ts";
import { universalFormatter } from "../formatters/universalFormatter.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ApiResponse } from "../utils/apiResponse.ts";
import { ApiError } from "../utils/apiError.ts";
import { axiosGetWithRetry } from "../utils/scraperUtils.ts";

const DEVPOST_API_URL = "https://devpost.com/api/hackathons";
const DEVPOST_DETAIL_CONCURRENCY = 5;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
};

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const parseDevpostDateText = (text: string | null, year = new Date().getFullYear()): Date | null => {
  if (!text) return null;
  // Match "Month Day[, Year] at Time(am/pm) [TZ]"
  const match = text.match(/([a-zA-Z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?\s+at\s+(\d{1,2}:\d{2})\s*([ap]m)?\s*([a-zA-Z]{3,4})?/i);
  if (match) {
    const [_, month, day, matchedYear, time, ampm, tz] = match;
    const finalYear = matchedYear || year.toString();
    const formatted = `${month} ${day}, ${finalYear} ${time} ${ampm || ""} ${tz || ""}`.trim().replace(/\s+/g, ' ');
    const parsed = new Date(formatted);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  // Try fallback with simple Date constructor
  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  return null;
};

const enrichSingleDevpostHackathon = async (hack: any): Promise<any> => {
  const url = hack?.url;
  if (!url) return hack;

  try {
    const { data: html } = await axiosGetWithRetry(url, {
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

    // 1. Try to fetch details/dates subpage
    try {
      const datesUrl = url.endsWith('/') ? `${url}details/dates` : `${url}/details/dates`;
      const { data: datesHtml } = await axiosGetWithRetry(datesUrl, {
        timeout: 10000,
      });
      const $dates = cheerio.load(datesHtml);
      $dates("table tr").each((_i, tr) => {
        const cells = $dates(tr).find("td, th");
        if (cells.length >= 3) {
          const name = normalizeString($dates(cells.get(0)).text());
          if (name && name !== "Period") {
            const beginsText = normalizeString($dates(cells.get(1)).text());
            const beginsDate = parseDevpostDateText(beginsText);
            const endsText = normalizeString($dates(cells.get(2)).text());
            const endsDate = parseDevpostDateText(endsText);
            
            if (beginsDate && !isNaN(beginsDate.getTime())) {
              detailStages.push({
                name: `${name} Begins`,
                deadline: beginsDate,
              });
            }
            if (endsDate && !isNaN(endsDate.getTime())) {
              detailStages.push({
                name: `${name} Ends`,
                deadline: endsDate,
              });
            }
          }
        }
      });
    } catch (err: any) {
      // Subpage might not exist or failed to fetch
    }

    // 2. Fall back to sidebar dates on overview page
    if (detailStages.length === 0) {
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
              } else {
                const parsedClean = parseDevpostDateText(dateText);
                if (parsedClean) {
                  detailStages.push({
                    name: title,
                    deadline: parsedClean,
                  });
                }
              }
            }
          }
        });
      }
    }

    // 3. Fall back to API dates
    if (detailStages.length === 0) {
      if (hack?.submission_period_dates) {
        const parts = hack.submission_period_dates.split(" - ");
        if (parts.length === 2) {
          const startStr = parts[0].trim();
          const endStr = parts[1].trim();
          const yearMatch = endStr.match(/\d{4}/);
          const year = yearMatch ? parseInt(yearMatch[0], 10) : new Date().getFullYear();
          
          const parsedStart = parseDevpostDateText(`${startStr} 12:00am`, year);
          const parsedEnd = parseDevpostDateText(`${endStr} 11:59pm`, year);
          
          if (parsedStart && !isNaN(parsedStart.getTime())) {
            detailStages.push({ name: "Submission Starts", deadline: parsedStart });
          }
          if (parsedEnd && !isNaN(parsedEnd.getTime())) {
            detailStages.push({ name: "Submission Ends", deadline: parsedEnd });
          }
        } else {
          const parsedDate = new Date(hack.submission_period_dates);
          if (!isNaN(parsedDate.getTime())) {
            detailStages.push({ name: "Submission Deadline", deadline: parsedDate });
          }
        }
      }
      if (hack?.winners_announced) {
        const parsed = new Date(hack.winners_announced);
        if (!isNaN(parsed.getTime())) {
          detailStages.push({ name: "Winners Announced", deadline: parsed });
        }
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
      const response = await axiosGetWithRetry(DEVPOST_API_URL, {
        params: {
          "challenge_type[]": "online",
          "status[]": "open",
          page: page,
          per_page: 20
        },
        timeout: 20000
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
