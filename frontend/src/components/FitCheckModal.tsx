import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, X, ExternalLink, SlidersHorizontal, Loader2 } from "lucide-react";
import type { TravelPreference, UserPreferences } from "../context/AuthContext";
import {
  AVAILABLE_MODES,
  AVAILABLE_PLATFORMS,
  DEFAULT_PREFERENCES,
  evaluateHackathonFit,
  hasConfiguredPreferences,
  saveLocalPreferences,
  TRAVEL_PREFERENCE_LABELS,
  type FitHackathonInput,
} from "../utils/fitEngine";

type FitCheckModalProps = {
  isOpen: boolean;
  hackathon: FitHackathonInput | null;
  preferences: UserPreferences | null;
  isAuthenticated: boolean;
  onClose: () => void;
  onSavePreferences: (prefs: UserPreferences) => Promise<void>;
  onTrack?: (hackathonId: string) => void;
  isTracked?: boolean;
};

export default function FitCheckModal({
  isOpen,
  hackathon,
  preferences,
  isAuthenticated,
  onClose,
  onSavePreferences,
  onTrack,
  isTracked,
}: FitCheckModalProps) {
  const isConfigured = hasConfiguredPreferences(preferences);
  const [isEditing, setIsEditing] = useState(!isConfigured);
  const [homeCity, setHomeCity] = useState(preferences?.homeCity || "");
  const [travelPreference, setTravelPreference] = useState<TravelPreference>(
    preferences?.travelPreference || DEFAULT_PREFERENCES.travelPreference
  );
  const [maxTravelBudgetINR, setMaxTravelBudgetINR] = useState<number>(
    preferences?.maxTravelBudgetINR ?? DEFAULT_PREFERENCES.maxTravelBudgetINR
  );
  const [minPrizeINR, setMinPrizeINR] = useState<number>(
    preferences?.minPrizeINR ?? DEFAULT_PREFERENCES.minPrizeINR
  );
  const [minDaysToPrepare, setMinDaysToPrepare] = useState<number>(
    preferences?.minDaysToPrepare ?? DEFAULT_PREFERENCES.minDaysToPrepare
  );
  const [preferredModes, setPreferredModes] = useState<string[]>(preferences?.preferredModes || []);
  const [preferredPlatforms, setPreferredPlatforms] = useState<string[]>(preferences?.preferredPlatforms || []);
  const [preferredTeamSize, setPreferredTeamSize] = useState<number>(
    preferences?.preferredTeamSize ?? DEFAULT_PREFERENCES.preferredTeamSize
  );
  const [skillsInput, setSkillsInput] = useState((preferences?.skills || []).join(", "));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const configured = hasConfiguredPreferences(preferences);
    setIsEditing(!configured);
    setHomeCity(preferences?.homeCity || "");
    setTravelPreference(preferences?.travelPreference || DEFAULT_PREFERENCES.travelPreference);
    setMaxTravelBudgetINR(preferences?.maxTravelBudgetINR ?? DEFAULT_PREFERENCES.maxTravelBudgetINR);
    setMinPrizeINR(preferences?.minPrizeINR ?? DEFAULT_PREFERENCES.minPrizeINR);
    setMinDaysToPrepare(preferences?.minDaysToPrepare ?? DEFAULT_PREFERENCES.minDaysToPrepare);
    setPreferredModes(preferences?.preferredModes || []);
    setPreferredPlatforms(preferences?.preferredPlatforms || []);
    setPreferredTeamSize(preferences?.preferredTeamSize ?? DEFAULT_PREFERENCES.preferredTeamSize);
    setSkillsInput((preferences?.skills || []).join(", "));
  }, [isOpen, preferences]);

  if (!hackathon) return null;

  const toggleItem = (list: string[], value: string, setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const currentPrefs: UserPreferences = {
    homeCity: homeCity.trim(),
    travelPreference,
    maxTravelBudgetINR,
    minPrizeINR,
    minDaysToPrepare,
    preferredModes,
    preferredPlatforms,
    preferredTeamSize,
    skills: skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };

  const result = evaluateHackathonFit(hackathon, isEditing ? currentPrefs : preferences || currentPrefs);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      saveLocalPreferences(currentPrefs);
      await onSavePreferences(currentPrefs);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const verdictStyles =
    result.verdict === "strong"
      ? {
          badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
        }
      : result.verdict === "consider"
      ? {
          badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
          icon: <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />,
        }
      : {
          badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
          icon: <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />,
        };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.16 }}
            className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200/80 px-6 py-4 dark:border-zinc-800/80 shrink-0">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Participation Fit Check
                </p>
                <h3 className="mt-0.5 text-base font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                  {hackathon.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {isEditing ? (
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Set your participation criteria
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {isAuthenticated
                        ? "Saved to your profile for accurate, personalized fit scoring."
                        : "Saved locally in your browser. Sign in anytime to sync across devices."}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Home City
                      </label>
                      <input
                        type="text"
                        value={homeCity}
                        onChange={(e) => setHomeCity(e.target.value)}
                        placeholder="e.g. Bengaluru, Delhi"
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition hover:border-zinc-300 focus:border-blue-500/70 focus:bg-white focus:ring-3 focus:ring-blue-500/12 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-700 dark:focus:bg-zinc-950 dark:focus:border-blue-500/60 dark:focus:ring-blue-500/15"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Usual Team Size
                      </label>
                      <select
                        value={preferredTeamSize}
                        onChange={(e) => setPreferredTeamSize(Number(e.target.value))}
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:bg-zinc-950 cursor-pointer"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                            {n} {n === 1 ? "member (Solo)" : "members"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Minimum Prize Pool (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={5000}
                        value={minPrizeINR}
                        onChange={(e) => setMinPrizeINR(Number(e.target.value))}
                        placeholder="0 for any"
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition hover:border-zinc-300 focus:border-blue-500/70 focus:bg-white focus:ring-3 focus:ring-blue-500/12 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-700 dark:focus:bg-zinc-950 dark:focus:border-blue-500/60 dark:focus:ring-blue-500/15"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Min Days to Prepare
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={minDaysToPrepare}
                        onChange={(e) => setMinDaysToPrepare(Number(e.target.value))}
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition hover:border-zinc-300 focus:border-blue-500/70 focus:bg-white focus:ring-3 focus:ring-blue-500/12 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-700 dark:focus:bg-zinc-950 dark:focus:border-blue-500/60 dark:focus:ring-blue-500/15"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Travel Willingness
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(TRAVEL_PREFERENCE_LABELS) as TravelPreference[]).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setTravelPreference(key)}
                          className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold transition cursor-pointer ${
                            travelPreference === key
                              ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                              : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                          }`}
                        >
                          {TRAVEL_PREFERENCE_LABELS[key]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {travelPreference !== "online_only" && travelPreference !== "same_city" && (
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Max Travel Budget (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={maxTravelBudgetINR}
                        onChange={(e) => setMaxTravelBudgetINR(Number(e.target.value))}
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition hover:border-zinc-300 focus:border-blue-500/70 focus:bg-white focus:ring-3 focus:ring-blue-500/12 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-700 dark:focus:bg-zinc-950 dark:focus:border-blue-500/60 dark:focus:ring-blue-500/15"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Preferred Event Modes <span className="font-normal text-zinc-400">(optional)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_MODES.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => toggleItem(preferredModes, m, setPreferredModes)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition cursor-pointer ${
                            preferredModes.includes(m)
                              ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                              : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Preferred Platforms <span className="font-normal text-zinc-400">(optional)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_PLATFORMS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => toggleItem(preferredPlatforms, p, setPreferredPlatforms)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                            preferredPlatforms.includes(p)
                              ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                              : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Primary Skills / Stack (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={skillsInput}
                      onChange={(e) => setSkillsInput(e.target.value)}
                      placeholder="e.g. React, Node.js, AI, Python"
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-blue-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:bg-zinc-950"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    {isConfigured && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="rounded-lg border border-zinc-200 px-3.5 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-60 cursor-pointer"
                    >
                      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Save & Check Fit
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-5">
                  {/* Verdict Summary */}
                  <div className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${verdictStyles.badge}`}>
                    <div className="flex items-center gap-3">
                      {verdictStyles.icon}
                      <div>
                        <p className="text-sm font-extrabold">{result.label}</p>
                        <p className="text-xs opacity-85">
                          Fit Score: {result.score}/100 • {hackathon.platform}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-current/20 bg-white/70 px-2.5 py-1.5 text-[11px] font-bold transition hover:bg-white dark:bg-zinc-900/70 dark:hover:bg-zinc-900 cursor-pointer"
                    >
                      <SlidersHorizontal className="h-3 w-3" />
                      Edit Context
                    </button>
                  </div>

                  {/* Breakdown */}
                  <div className="space-y-2.5">
                    {result.reasons.map((reason) => (
                      <div
                        key={reason.label}
                        className="flex items-start gap-3 rounded-lg border border-zinc-100 bg-zinc-50/70 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/50"
                      >
                        <span
                          className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                            reason.status === "good"
                              ? "bg-emerald-500"
                              : reason.status === "warn"
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            {reason.label}
                          </p>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                            {reason.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    {hackathon.applyLink && (
                      <a
                        href={hackathon.applyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        Official Site
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {onTrack && !isTracked && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onTrack(hackathon._id);
                        }}
                        className="flex-1 inline-flex items-center justify-center rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-blue-500 cursor-pointer"
                      >
                        Track Hackathon
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
