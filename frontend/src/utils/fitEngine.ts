import type { TravelPreference, UserPreferences } from "../context/AuthContext";

export type FitHackathonInput = {
  _id: string;
  title: string;
  platform: string;
  deadline?: string;
  startDate?: string;
  mode?: string;
  prize?: string;
  location?: string;
  applyLink?: string;
};

export type FitReason = {
  label: string;
  status: "good" | "warn" | "bad";
  detail: string;
};

export type FitVerdict = "strong" | "consider" | "poor";

export type FitAnalysisResult = {
  verdict: FitVerdict;
  label: "Worth It" | "Consider" | "Low Fit";
  score: number;
  reasons: FitReason[];
};

const LOCAL_PREFS_KEY = "hackdekh_fit_preferences";

export const AVAILABLE_MODES = ["online", "in-person", "hybrid"] as const;
export const AVAILABLE_PLATFORMS = ["Devfolio", "Unstop", "Devpost", "MLH", "Hack2Skill"] as const;

export const DEFAULT_PREFERENCES: Required<UserPreferences> = {
  homeCity: "",
  travelPreference: "anywhere_reimbursed",
  maxTravelBudgetINR: 2000,
  minPrizeINR: 0,
  minDaysToPrepare: 3,
  preferredModes: [],
  preferredPlatforms: [],
  preferredTeamSize: 3,
  skills: [],
};

export function hasConfiguredPreferences(prefs?: UserPreferences | null): boolean {
  if (!prefs) return false;
  return Boolean(
    prefs.homeCity?.trim() ||
    prefs.travelPreference ||
    (prefs.minPrizeINR && prefs.minPrizeINR > 0) ||
    (prefs.preferredModes && prefs.preferredModes.length > 0) ||
    (prefs.preferredPlatforms && prefs.preferredPlatforms.length > 0) ||
    (prefs.skills && prefs.skills.length > 0)
  );
}

export function loadLocalPreferences(): UserPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_PREFS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserPreferences;
  } catch {
    return null;
  }
}

export function saveLocalPreferences(prefs: UserPreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}

function parsePrizeINR(prize?: string): number | null {
  if (!prize) return null;
  const cleaned = prize.replace(/,/g, "");
  const match = cleaned.match(/(\d+(?:\.\d+)?)\s*(lakh|lac|cr|crore|k)?/i);
  if (!match) return null;
  let amount = Number(match[1]);
  if (Number.isNaN(amount)) return null;
  const unit = (match[2] || "").toLowerCase();
  if (unit === "k") amount *= 1000;
  else if (unit === "lakh" || unit === "lac") amount *= 100000;
  else if (unit === "cr" || unit === "crore") amount *= 10000000;
  return amount;
}

function getDaysUntilDeadline(deadline?: string): number | null {
  if (!deadline?.trim()) return null;
  const parsed = new Date(deadline.trim());
  if (Number.isNaN(parsed.getTime())) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(deadline.trim())) {
    parsed.setHours(23, 59, 59, 999);
  }
  return Math.ceil((parsed.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function detectHackathonMode(mode?: string, location?: string): "online" | "in-person" | "hybrid" | "unknown" {
  const m = (mode || "").toLowerCase();
  const l = (location || "").toLowerCase();
  if (/hybrid/i.test(m)) return "hybrid";
  if (/in-?person|offline/i.test(m)) return "in-person";
  if (/online|virtual|remote/i.test(m) || /online|virtual|remote/i.test(l)) return "online";
  return "unknown";
}

export function evaluateHackathonFit(
  hackathon: FitHackathonInput,
  rawPrefs?: UserPreferences | null
): FitAnalysisResult {
  const prefs: Required<UserPreferences> = {
    ...DEFAULT_PREFERENCES,
    ...(rawPrefs || {}),
    preferredModes: rawPrefs?.preferredModes || [],
    preferredPlatforms: rawPrefs?.preferredPlatforms || [],
    skills: rawPrefs?.skills || [],
  };

  // Start at a neutral 55 so verdicts genuinely differentiate strong vs mediocre vs poor fits
  let score = 55;
  const reasons: FitReason[] = [];

  const detectedMode = detectHackathonMode(hackathon.mode, hackathon.location);
  const location = (hackathon.location || "").toLowerCase();
  const homeCity = prefs.homeCity.trim().toLowerCase();
  const isOnline = detectedMode === "online";
  const isInPerson = detectedMode === "in-person";
  const isHybrid = detectedMode === "hybrid";
  const sameCity = Boolean(homeCity && location.includes(homeCity));

  // 1. Mode Filter Check
  if (prefs.preferredModes.length > 0 && detectedMode !== "unknown") {
    if (!prefs.preferredModes.includes(detectedMode)) {
      score -= 30;
      reasons.push({
        label: "Event Mode",
        status: "bad",
        detail: `Event is ${detectedMode}, which is outside your preferred modes (${prefs.preferredModes.join(", ")}).`,
      });
    } else {
      score += 10;
    }
  }

  // 2. Travel & Location Fit
  if (isOnline) {
    score += 15;
    reasons.push({
      label: "Mode & Travel",
      status: "good",
      detail: "Fully online — zero travel cost or commute.",
    });
  } else if (isInPerson || isHybrid) {
    if (sameCity) {
      score += 15;
      reasons.push({
        label: "Mode & Travel",
        status: "good",
        detail: `Hosted in ${hackathon.location} — matches your home city (${prefs.homeCity}).`,
      });
    } else if (prefs.travelPreference === "online_only") {
      score -= 40;
      reasons.push({
        label: "Mode & Travel",
        status: "bad",
        detail: `${isHybrid ? "Hybrid" : "In-person"} event (${hackathon.location || "location TBD"}), but your profile is set to Online Only.`,
      });
    } else if (prefs.travelPreference === "same_city") {
      score -= 35;
      reasons.push({
        label: "Mode & Travel",
        status: "bad",
        detail: `Outside ${prefs.homeCity || "your home city"} (${hackathon.location || "location TBD"}).`,
      });
    } else if (prefs.travelPreference === "anywhere_reimbursed") {
      score -= 10;
      reasons.push({
        label: "Mode & Travel",
        status: "warn",
        detail: `${isHybrid ? "Hybrid" : "In-person"} in ${hackathon.location || "TBD"} — verify travel reimbursement (budget cap: ₹${prefs.maxTravelBudgetINR.toLocaleString("en-IN")}).`,
      });
    } else {
      score += 5;
      reasons.push({
        label: "Mode & Travel",
        status: "good",
        detail: `${isHybrid ? "Hybrid" : "In-person"} in ${hackathon.location || "TBD"} — fits your open travel preference.`,
      });
    }
  } else {
    reasons.push({
      label: "Mode & Travel",
      status: "warn",
      detail: "Event mode is not explicitly listed; verify before committing.",
    });
  }

  // 3. Preparation Window vs minDaysToPrepare
  const daysLeft = getDaysUntilDeadline(hackathon.deadline);
  const minPrep = prefs.minDaysToPrepare ?? 3;
  if (daysLeft !== null) {
    if (daysLeft < 0) {
      score = 0;
      reasons.push({
        label: "Deadline & Prep",
        status: "bad",
        detail: "Registration deadline has already passed.",
      });
    } else if (daysLeft < minPrep) {
      score -= 20;
      reasons.push({
        label: "Deadline & Prep",
        status: "bad",
        detail: `Only ${Math.max(daysLeft, 1)} day(s) left — below your ${minPrep}-day minimum preparation window.`,
      });
    } else {
      score += 10;
      reasons.push({
        label: "Deadline & Prep",
        status: "good",
        detail: `${daysLeft} days left — meets your ${minPrep}+ day preparation window.`,
      });
    }
  } else {
    score -= 5;
    reasons.push({
      label: "Deadline & Prep",
      status: "warn",
      detail: "Deadline is TBD — verify submission cutoff on the host platform.",
    });
  }

  // 4. Prize Minimum & Travel ROI
  const prizeINR = parsePrizeINR(hackathon.prize);
  const minPrize = prefs.minPrizeINR ?? 0;
  if (prizeINR !== null) {
    if (minPrize > 0 && prizeINR < minPrize) {
      score -= 25;
      reasons.push({
        label: "Prize & ROI",
        status: "bad",
        detail: `Prize pool (${hackathon.prize}) is below your ₹${minPrize.toLocaleString("en-IN")} minimum threshold.`,
      });
    } else if (!isOnline && !sameCity && prizeINR < Math.max(prefs.maxTravelBudgetINR, 1000) * 5) {
      score -= 15;
      reasons.push({
        label: "Prize & ROI",
        status: "warn",
        detail: `Prize pool (${hackathon.prize}) is tight relative to your ₹${prefs.maxTravelBudgetINR.toLocaleString("en-IN")} out-of-city travel budget.`,
      });
    } else if (prizeINR >= Math.max(minPrize, 50000)) {
      score += 15;
      reasons.push({
        label: "Prize & ROI",
        status: "good",
        detail: `Strong prize pool (${hackathon.prize})${minPrize > 0 ? ` — exceeds your ₹${minPrize.toLocaleString("en-IN")} minimum` : ""}.`,
      });
    } else {
      score += 5;
      reasons.push({
        label: "Prize & ROI",
        status: "good",
        detail: `Listed prize pool: ${hackathon.prize}.`,
      });
    }
  } else {
    if (minPrize > 0) {
      score -= 10;
    }
    reasons.push({
      label: "Prize & ROI",
      status: "warn",
      detail: "Prize pool is not disclosed yet — weigh for learning or networking value.",
    });
  }

  // 5. Platform Preference
  if (prefs.preferredPlatforms.length > 0) {
    const platformMatch = prefs.preferredPlatforms.some(
      (p) => p.toLowerCase() === hackathon.platform.toLowerCase()
    );
    if (platformMatch) {
      score += 10;
      reasons.push({
        label: "Platform",
        status: "good",
        detail: `Hosted on ${hackathon.platform} (one of your preferred platforms).`,
      });
    } else {
      score -= 10;
      reasons.push({
        label: "Platform",
        status: "warn",
        detail: `Hosted on ${hackathon.platform}, outside your preferred platforms (${prefs.preferredPlatforms.join(", ")}).`,
      });
    }
  }

  // 6. Skills & Theme Alignment
  if (prefs.skills.length > 0) {
    const haystack = `${hackathon.title} ${hackathon.platform}`.toLowerCase();
    const matched = prefs.skills.filter((skill) => {
      const normalized = skill.trim().toLowerCase();
      return normalized.length >= 2 && haystack.includes(normalized);
    });
    if (matched.length > 0) {
      score += 15;
      reasons.push({
        label: "Skills & Theme",
        status: "good",
        detail: `Title/track matches your stack (${matched.join(", ")}).`,
      });
    } else {
      reasons.push({
        label: "Skills & Theme",
        status: "warn",
        detail: `No explicit keyword match for ${prefs.skills.slice(0, 3).join(", ")} in the title — check problem statements on the host page.`,
      });
    }
  }

  const clampedScore = Math.max(0, Math.min(100, score));
  let verdict: FitVerdict = "consider";
  let label: FitAnalysisResult["label"] = "Consider";

  if (daysLeft !== null && daysLeft < 0) {
    verdict = "poor";
    label = "Low Fit";
  } else if (clampedScore >= 75) {
    verdict = "strong";
    label = "Worth It";
  } else if (clampedScore < 50) {
    verdict = "poor";
    label = "Low Fit";
  }

  return {
    verdict,
    label,
    score: clampedScore,
    reasons,
  };
}

export const TRAVEL_PREFERENCE_LABELS: Record<TravelPreference, string> = {
  online_only: "Online only",
  same_city: "Same city only",
  anywhere_reimbursed: "Travel if reimbursed",
  anywhere: "Open to travel anywhere",
};
