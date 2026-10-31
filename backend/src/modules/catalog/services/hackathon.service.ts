import hackathon from "../models/hackathon.model.ts";
import axios from "axios";
import redisClient from "../../../infrastructure/cache/redis.ts";
import { hackathonListCacheKey } from "../../../infrastructure/cache/cacheKeys.ts";

const HACKATHON_CACHE_TTL = 60;
const CACHE_ENABLED = process.env.CACHE_ENABLED !== "false";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

let cachedRate = 84;
let lastFetchedTime = 0;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // Cache rate for 12 hours

export const getUSDToINRExchangeRate = async (): Promise<number> => {
  const now = Date.now();
  if (now - lastFetchedTime < CACHE_TTL_MS) {
    return cachedRate;
  }

  try {
    const response = await axios.get("https://open.er-api.com/v6/latest/USD", { timeout: 5000 });
    const rates = response.data?.rates;
    if (rates && typeof rates.INR === "number" && rates.INR > 0) {
      cachedRate = rates.INR;
      lastFetchedTime = now;
      console.log("[ExchangeRate] Updated USD to INR rate:", cachedRate);
    }
  } catch (err: any) {
    try {
      const fallback = await axios.get("https://api.exchangerate-api.com/v4/latest/USD", { timeout: 5000 });
      const rates = fallback.data?.rates;
      if (rates && typeof rates.INR === "number" && rates.INR > 0) {
        cachedRate = rates.INR;
        lastFetchedTime = now;
        console.log("[ExchangeRate] Fallback updated USD to INR rate:", cachedRate);
      }
    } catch (fallbackErr: any) {
      console.warn("[ExchangeRate] Using fallback rate:", cachedRate);
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
    .replace(/^\s*(?:total\s+)?prize\s*pool\s*[:\-?]?\s*/i, "")
    .replace(/^\s*prizes?\s*[:\-?]?\s*/i, "")
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

export interface HackathonQueryFilters {
  search?: string | undefined;
  platform?: string | undefined;
  mode?: string | undefined;
  location?: string | undefined;
  sortBy?: string | undefined;
  showExpired?: string | undefined;
}

export interface HackathonQueryResult {
  data: any[];
  message: string;
  fromCache: boolean;
}

export const getHackathonsService = async (filters: HackathonQueryFilters): Promise<HackathonQueryResult> => {
  const { search, platform, mode, location, sortBy, showExpired } = filters;

  const cacheKey = hackathonListCacheKey({
    search, platform, mode, location, sortBy, showExpired,
  });

  if (CACHE_ENABLED && redisClient.isOpen) {
    try {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log(`[Redis] CACHE HIT: ${cacheKey}`);
        return {
          data: JSON.parse(cachedData),
          message: "Hackathons fetched from Redis cache",
          fromCache: true,
        };
      }
      console.log(`[Redis] CACHE MISS: ${cacheKey}`);
    } catch (redisErr) {
      console.warn("[Redis] Failed to read from cache:", redisErr);
    }
  }

  const usdToInrRate = await getUSDToINRExchangeRate();

  const isShowExpired = showExpired === "true";
  const conditions: any[] = [];

  if (platform) {
    const safePlatform = String(platform).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    conditions.push({ platform: { $regex: new RegExp(`^${safePlatform}$`, "i") } });
  }

  if (mode) {
    const safeMode = escapeRegExp(String(mode));
    conditions.push({ mode: { $regex: new RegExp(`^${safeMode}$`, "i") } });
  }

  if (location) {
    const safeLocation = escapeRegExp(String(location));
    conditions.push({ location: { $regex: new RegExp(safeLocation, "i") } });
  }

  if (search) {
    const searchRegex = new RegExp(search, "i");
    conditions.push({
      $or: [
        { title: { $regex: searchRegex } },
        { organization: { $regex: searchRegex } },
        { tags: { $in: [searchRegex] } },
      ],
    });
  }

  if (!isShowExpired) {
    conditions.push({
      $or: [
        { deadline: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        { deadline: null },
      ],
    });
  }

  const query = conditions.length === 0 ? {} : conditions.length === 1 ? conditions[0] : { $and: conditions };

  let list = await hackathon.find(query).select("-description -stages -__v").lean();

  const nowMs = Date.now();
  const activeList: any[] = [];
  const expiredList: any[] = [];

  for (const h of list as any[]) {
    if (isZeroOrNoCashPrize(h.prize)) continue;

    const deadlineDate = getComparableDeadlineDate(h.deadline);
    const deadlineTime = deadlineDate ? deadlineDate.getTime() : null;
    const isExpired = deadlineTime !== null && deadlineTime < nowMs;

    if (!isShowExpired && isExpired) continue;

    h._deadlineTime = deadlineTime;
    h._prizeAmount = getPrizeAmountInINR(h.prize, h.platform, usdToInrRate);

    if (isExpired) {
      expiredList.push(h);
    } else {
      activeList.push(h);
    }
  }

  const sortOption = sortBy || "deadline-asc";

  activeList.sort((a: any, b: any) => {
    if (sortOption === "deadline-asc") return compareNullableNumbers(a._deadlineTime, b._deadlineTime, "asc");
    if (sortOption === "deadline-desc") return compareNullableNumbers(a._deadlineTime, b._deadlineTime, "desc");
    if (sortOption === "prize-asc") return compareNullableNumbers(a._prizeAmount, b._prizeAmount, "asc");
    if (sortOption === "prize-desc") return compareNullableNumbers(a._prizeAmount, b._prizeAmount, "desc");
    return 0;
  });

  expiredList.sort((a: any, b: any) => {
    if (!sortBy || sortOption === "deadline-asc" || sortOption === "deadline-desc") {
      return compareNullableNumbers(a._deadlineTime, b._deadlineTime, "desc");
    }
    if (sortOption === "prize-asc") return compareNullableNumbers(a._prizeAmount, b._prizeAmount, "asc");
    if (sortOption === "prize-desc") return compareNullableNumbers(a._prizeAmount, b._prizeAmount, "desc");
    return 0;
  });

  list = [...activeList, ...expiredList];

  const plainList = list.map((h: any) => {
    delete h._deadlineTime;
    delete h._prizeAmount;
    h.prize = convertAndFormatPrizeToINR(h.prize, h.platform, usdToInrRate);
    return h;
  });

  if (CACHE_ENABLED && redisClient.isOpen) {
    try {
      await redisClient.set(cacheKey, JSON.stringify(plainList), {
        EX: HACKATHON_CACHE_TTL,
      });
      console.log(`[Redis] cache set: ${cacheKey}`);
    } catch (redisErr) {
      console.warn("[Redis] Failed to save to cache:", redisErr);
    }
  }

  return {
    data: plainList,
    message: "Hackathons fetched successfully",
    fromCache: false,
  };
};
