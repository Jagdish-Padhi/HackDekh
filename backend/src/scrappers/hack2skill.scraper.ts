import axios from "axios";
import hackathon from "../models/hackathon.model.ts";
import { universalFormatter } from "../formatters/universalFormatter.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ApiResponse } from "../utils/apiResponse.ts";
import { ApiError } from "../utils/apiError.ts";
import { axiosGetWithRetry } from "../utils/scraperUtils.ts";

const HACK2SKILL_EVENTS_API = "https://hack2skill.com/api/v1/innovator/public/event/list";

export const scrapeHack2Skill = asyncHandler(async (req: any, res: any) => {
  try {
    const data = await scrapeHack2SkillData();
    return res.status(200).json(new ApiResponse(200, { ok: true, count: data.length }, "Hack2Skill hackathons scraped successfully!"));
  } catch (error: any) {
    throw new ApiError(500, error.message || "Internal server error");
  }
});

export async function scrapeHack2SkillData() {
  try {
    console.log("[Hack2Skill Scraper] Fetching public event list API...");
    const response = await axiosGetWithRetry(HACK2SKILL_EVENTS_API, {
      timeout: 20000
    });

    const data = response.data;
    if (!data || !data.success || !data.data) {
      throw new Error("Invalid response format from Hack2Skill API.");
    }

    // The list API already returns all data we need per event:
    // tags.teamSize.min/max, tags.mode.value, tags.ticket.value,
    // tags.impressions, tags.registrations, tags.technology, tags.finale, etc.
    // No separate detail API endpoint available/working.

    const flagshipEvents = data.data.flagshipEvents || [];
    const communityEvents = data.data.communityEvents || [];
    const allEvents = [...flagshipEvents, ...communityEvents];

    const now = Date.now();
    const upcomingEvents = allEvents.filter((h: any) => {
      if (!h.registrationEnd) return true;
      const end = new Date(h.registrationEnd).getTime();
      return !isNaN(end) && end >= now;
    });

    if (upcomingEvents.length === 0) {
      console.warn("[Hack2Skill Scraper] No upcoming events found in API.");
      return [];
    }

    console.log(`[Hack2Skill Scraper] Found ${upcomingEvents.length} upcoming events (filtered from ${allEvents.length} total). Formatting...`);
    const normalizedList = universalFormatter(upcomingEvents, "hack2skill");

    console.log(`[Hack2Skill Scraper] Saving ${normalizedList.length} items to database...`);
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
        console.error(`[Hack2Skill DB Error] Failed to save slug ${hack.slug}:`, err.message);
      }
    }

    console.log(`[Hack2Skill Scraper] Successfully saved ${saveCount} Hack2Skill hackathons.`);
    return normalizedList;
  } catch (error) {
    console.error("[Hack2Skill Scraper Error] Failed:", error);
    throw error;
  }
}
