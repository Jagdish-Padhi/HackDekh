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

export const DEFAULT_PREFERENCES: Required<UserPreferences> = {
  homeCity: "",
  travelPreference: "anywhere_reimbursed",
  maxTravelBudgetINR: 2000,
  preferredTeamSize: 3,
  skills: [],
};

export function hasConfiguredPreferences(prefs?: UserPreferences | null): boolean {
  if (!prefs) return false;
  return Boolean(
    prefs.homeCity?.trim() ||
    prefs.travelPreference ||
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

export function evaluateHackathonFit(
  hackathon: FitHackathonInput,
  rawPrefs?: UserPreferences | null
): FitAnalysisResult {
  const prefs: Required<UserPreferences> = {
    ...DEFAULT_PREFERENCES,
    ...(rawPrefs || {}),
    skills: rawPrefs?.skills || [],
  };

  let score = 70;
  const reasons: FitReason[] = [];

  const mode = (hackathon.mode || "").toLowerCase();
  const location = (hackathon.location || "").toLowerCase();
  const homeCity = prefs.homeCity.trim().toLowerCase();
  const isOnline = /online|virtual|remote/i.test(mode) || /online|virtual|remote/i.test(location);
  const isInPerson = /in-?person|offline/i.test(mode);
  const isHybrid = /hybrid/i.test(mode);
  const sameCity = Boolean(homeCity && location.includes(homeCity));

  // 1. Mode & Travel Fit
  if (isOnline) {
    score += 15;
    reasons.push({
      label: "Mode & Travel",
      status: "good",
      detail: "Fully online — zero travel cost or commute.",
    });
  } else if (isInPerson || isHybrid) {
    if (sameCity) {
      score += 10;
      reasons.push({
        label: "Mode & Travel",
        status: "good",
        detail: `Hosted in ${hackathon.location} — matches your home city (${prefs.homeCity}).`,
      });
    } else if (prefs.travelPreference === "online_only") {
      score -= 45;
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
        detail: `${isHybrid ? "Hybrid" : "In-person"} in ${hackathon.location || "TBD"} — verify travel reimbursement on the official page.`,
      });
    } else {
      reasons.push({
        label: "Mode & Travel",
        status: "good",
        detail: `${isHybrid ? "Hybrid" : "In-person"} in ${hackathon.location || "TBD"} — matches your open travel preference.`,
      });
    }
  } else {
    reasons.push({
      label: "Mode & Travel",
      status: "warn",
      detail: "Event mode is not explicitly listed; check the official page before committing.",
    });
  }

  // 2. Timeline Feasibility
  const daysLeft = getDaysUntilDeadline(hackathon.deadline);
  if (daysLeft !== null) {
    if (daysLeft < 0) {
      score = 0;
      reasons.push({
        label: "Deadline",
        status: "bad",
        detail: "Registration deadline has already passed.",
      });
    } else if (daysLeft <= 2) {
      score -= 15;
      reasons.push({
        label: "Deadline",
        status: "warn",
        detail: `Closes in ${Math.max(daysLeft, 1)} day(s) — tight window to form a team and submit.`,
      });
    } else {
      score += 10;
      reasons.push({
        label: "Deadline",
        status: "good",
        detail: `${daysLeft} days remaining to prepare and register.`,
      });
    }
  } else {
    reasons.push({
      label: "Deadline",
      status: "warn",
      detail: "Deadline is TBD — verify submission dates on the host platform.",
    });
  }

  // 3. Prize & ROI Signal
  const prizeINR = parsePrizeINR(hackathon.prize);
  if (prizeINR !== null) {
    if (!isOnline && !sameCity && prizeINR < (prefs.maxTravelBudgetINR || 2000) * 5) {
      score -= 10;
      reasons.push({
        label: "Prize & ROI",
        status: "warn",
        detail: `Prize pool (${hackathon.prize}) may be low relative to out-of-city travel costs.`,
      });
    } else if (prizeINR >= 50000) {
      score += 10;
      reasons.push({
        label: "Prize & ROI",
        status: "good",
        detail: `Strong prize pool (${hackathon.prize}) for the effort required.`,
      });
    } else {
      reasons.push({
        label: "Prize & ROI",
        status: "good",
        detail: `Listed prize pool: ${hackathon.prize}.`,
      });
    }
  } else {
    reasons.push({
      label: "Prize & ROI",
      status: "warn",
      detail: "Prize pool is not disclosed yet — weigh for learning or networking value.",
    });
  }

  // 4. Skills & Track Alignment
  if (prefs.skills.length > 0) {
    const haystack = `${hackathon.title} ${hackathon.platform}`.toLowerCase();
    const matched = prefs.skills.filter((skill) => {
      const normalized = skill.trim().toLowerCase();
      return normalized.length >= 2 && haystack.includes(normalized);
    });
    if (matched.length > 0) {
      score += 10;
      reasons.push({
        label: "Skills & Theme",
        status: "good",
        detail: `Matches your stack (${matched.join(", ")}).`,
      });
    } else {
      reasons.push({
        label: "Skills & Theme",
        status: "good",
        detail: `Open-ended or general theme — compatible with a ${prefs.preferredTeamSize}-person ${prefs.skills.slice(0, 2).join("/")} squad.`,
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
