import hackathon from "../models/hackathon.model.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ApiResponse } from "../utils/apiResponse.ts";
import { ApiError } from "../utils/apiError.ts";
import axios from "axios";

const isUnavailablePrize = (value: string) =>
  /^(?:tbd|na|n\/a|none|null|undefined|not\s*(?:announced|disclosed)|to\s*be\s*announced|--?)$/i.test(value.trim());

const getComparableDeadlineDate = (deadline?: Date | string | null) => {
  if (!deadline) {
    return null;
  }

  const rawDeadline = typeof deadline === "string" ? deadline.trim() : deadline.toISOString();
  const parsed = new Date(rawDeadline);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (typeof deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawDeadline)) {
    parsed.setHours(23, 59, 59, 999);
  }

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const hasDeadlinePassed = (deadline?: Date | string | null) => {
  const comparableDeadline = getComparableDeadlineDate(deadline);
  if (!comparableDeadline) {
    return false;
  }

  return comparableDeadline.getTime() < Date.now();
};

let cachedRate = 84;
let lastFetchedTime = 0;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // Cache rate for 12 hours

const getUSDToINRExchangeRate = async (): Promise<number> => {
  const now = Date.now();
  if (now - lastFetchedTime < CACHE_TTL_MS && lastFetchedTime > 0) {
    return cachedRate;
  }

  try {
    const response = await axios.get("https://api.frankfurter.app/latest?from=USD&to=INR", {
      timeout: 5000,
    });
    if (response.data && response.data.rates && typeof response.data.rates.INR === "number") {
      cachedRate = response.data.rates.INR;
      lastFetchedTime = now;
      console.log(`[ExchangeRate] Updated USD to INR exchange rate: ${cachedRate}`);
    }
  } catch (error: any) {
    console.error("[ExchangeRate] Failed to fetch live rate from Frankfurter, trying backup er-api...", error.message);
    try {
      const response = await axios.get("https://open.er-api.com/v6/latest/USD", {
        timeout: 5000,
      });
      if (response.data && response.data.rates && typeof response.data.rates.INR === "number") {
        cachedRate = response.data.rates.INR;
        lastFetchedTime = now;
        console.log(`[ExchangeRate] Updated USD to INR from er-api: ${cachedRate}`);
      }
    } catch (err: any) {
      console.error("[ExchangeRate] Failed to fetch from backup API. Using fallback:", cachedRate, err.message);
    }
  }

  return cachedRate;
};

const isZeroOrNoCashPrize = (prize?: string | null) => {
  if (!prize?.trim()) {
    return false;
  }
  const clean = prize.trim().toLowerCase();

  if (isUnavailablePrize(clean)) {
    return false;
  }

  // Strip currency symbols and common units to check if it's explicitly 0
  const stripCurrency = clean
    .replace(/[$\u20B9,]/g, "")
    .replace(/\b(?:usd|inr|rs|rupees|rupee|cash|prizes?|pool)\b/g, "")
    .trim();

  if (stripCurrency === "0" || stripCurrency === "0.0" || stripCurrency === "0.00") {
    return true;
  }

  if (/^(?:no\s*prize|no\s*cash|no\s*cash\s*prize|zero|none)$/i.test(clean)) {
    return true;
  }

  return false;
};

const getPrizeAmountInINR = (prize: string | null | undefined, platform: string | null | undefined, usdToInrRate: number) => {
  if (!prize?.trim()) {
    return null;
  }

  const cleanedPrize = prize
    .replace(/^\s*(?:total\s+)?prize\s*pool\s*[:\-–]?\s*/i, "")
    .replace(/^\s*prizes?\s*[:\-–]?\s*/i, "")
    .trim();

  if (!cleanedPrize || isUnavailablePrize(cleanedPrize)) {
    return null;
  }

  const isUSD = /[$\u0024]/g.test(cleanedPrize) || 
                /\b(?:usd|dollars?)\b/i.test(cleanedPrize) || 
                (platform && /^devpost$/i.test(platform));

  const amountRegex = /(\d[\d,]*(?:\.\d+)?)\s*(crore|cr|lakh|lac|k)?/gi;
  let totalAmount = 0;
  let hasValue = false;

  for (const match of cleanedPrize.matchAll(amountRegex)) {
    const val = match[1];
    if (!val) {
      continue;
    }
    const rawAmount = Number(val.replace(/,/g, ""));
    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      continue;
    }

    const unit = (match[2] || "").toLowerCase();
    const multiplier =
      unit === "crore" || unit === "cr"
        ? 10000000
        : unit === "lakh" || unit === "lac"
        ? 100000
        : unit === "k"
        ? 1000
        : 1;

    totalAmount += rawAmount * multiplier;
    hasValue = true;
  }

  if (!hasValue) {
    return null;
  }

  if (isUSD) {
    return totalAmount * usdToInrRate;
  }

  return totalAmount;
};

const convertAndFormatPrizeToINR = (prize: string | null | undefined, platform: string | null | undefined, usdToInrRate: number): string | null => {
  if (!prize?.trim()) {
    return "TBD";
  }

  const clean = prize.trim();
  if (isUnavailablePrize(clean)) {
    return "TBD";
  }

  const amountInINR = getPrizeAmountInINR(clean, platform, usdToInrRate);
  if (amountInINR === null || amountInINR <= 0) {
    return clean;
  }

  if (amountInINR >= 10000000) {
    const crValue = amountInINR / 10000000;
    const formatted = parseFloat(crValue.toFixed(2));
    return `₹${formatted} Cr+`;
  }
  if (amountInINR >= 100000) {
    const lakhValue = amountInINR / 100000;
    const formatted = parseFloat(lakhValue.toFixed(2));
    return `₹${formatted} Lakh+`;
  }
  if (amountInINR >= 1000) {
    const kValue = amountInINR / 1000;
    const formatted = parseFloat(kValue.toFixed(1));
    return `₹${formatted}k+`;
  }
  return `₹${amountInINR}+`;
};

const compareNullableNumbers = (a: number | null, b: number | null, direction: "asc" | "desc") => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === "asc" ? a - b : b - a;
};

export const getHackathons = asyncHandler(async (req: any, res: any) => {
  const { search, platform, mode, location, sortBy, showExpired } = req.query;

  // Fetch exchange rate dynamically with self-healing background caching
  const usdToInrRate = await getUSDToINRExchangeRate();

  // Build MongoDB query
  const query: any = {};

  if (platform) {
    query.platform = { $regex: new RegExp(`^${platform}$`, "i") };
  }

  if (mode) {
    query.mode = { $regex: new RegExp(`^${mode}$`, "i") };
  }

  if (location) {
    query.location = { $regex: new RegExp(location, "i") };
  }

  if (search) {
    const searchRegex = new RegExp(search, "i");
    query.$or = [
      { title: { $regex: searchRegex } },
      { organization: { $regex: searchRegex } },
      { tags: { $in: [searchRegex] } }
    ];
  }

  // Fetch from database
  let list = await hackathon.find(query);

  // Filter out explicit 0 or no cash prizes
  list = list.filter((h) => !isZeroOrNoCashPrize(h.prize));

  // Filter expired hackathons by default
  const isShowExpired = showExpired === "true";
  if (!isShowExpired) {
    list = list.filter((h) => !hasDeadlinePassed(h.deadline));
  }

  // Sort
  if (sortBy) {
    list.sort((a: any, b: any) => {
      if (sortBy === "deadline-asc") {
        const da = getComparableDeadlineDate(a.deadline)?.getTime() ?? null;
        const db = getComparableDeadlineDate(b.deadline)?.getTime() ?? null;
        return compareNullableNumbers(da, db, "asc");
      }

      if (sortBy === "deadline-desc") {
        const da = getComparableDeadlineDate(a.deadline)?.getTime() ?? null;
        const db = getComparableDeadlineDate(b.deadline)?.getTime() ?? null;
        return compareNullableNumbers(da, db, "desc");
      }

      if (sortBy === "prize-asc") {
        return compareNullableNumbers(getPrizeAmountInINR(a.prize, a.platform, usdToInrRate), getPrizeAmountInINR(b.prize, b.platform, usdToInrRate), "asc");
      }

      if (sortBy === "prize-desc") {
        return compareNullableNumbers(getPrizeAmountInINR(a.prize, a.platform, usdToInrRate), getPrizeAmountInINR(b.prize, b.platform, usdToInrRate), "desc");
      }

      return 0;
    });
  }

  // Format prize strings in returned list to attractive INR-only format
  const plainList = list.map((h: any) => {
    const obj = h.toObject ? h.toObject() : h;
    obj.prize = convertAndFormatPrizeToINR(obj.prize, obj.platform, usdToInrRate);
    return obj;
  });

  return res.status(200).json(new ApiResponse(200, plainList, "Hackathons fetched successfully"));
});

export const getHackathonById = asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  
  const hack = await hackathon.findById(id);
  if (!hack) {
    throw new ApiError(404, "Hackathon not found");
  }

  // Fetch exchange rate dynamically with self-healing background caching
  const usdToInrRate = await getUSDToINRExchangeRate();

  const obj = hack.toObject();
  obj.prize = convertAndFormatPrizeToINR(obj.prize, obj.platform, usdToInrRate);

  return res.status(200).json(new ApiResponse(200, obj, "Hackathon details fetched successfully"));
});
