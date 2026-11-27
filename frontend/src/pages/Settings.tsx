import { useEffect, useState } from "react";
import {
  Check,
  Shield,
  Moon,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  Loader2,
  User,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth, type TravelPreference, type UserPreferences } from "../context/AuthContext";
import { useToast } from "../context";
import { userApi } from "../services";
import {
  AVAILABLE_MODES,
  AVAILABLE_PLATFORMS,
  DEFAULT_PREFERENCES,
  saveLocalPreferences,
  TRAVEL_PREFERENCE_LABELS,
} from "../utils/fitEngine";
import axiosInstance from "../utils/axiosInstance";
import { AnimatePresence, motion } from "framer-motion";

/* ─── helpers ──────────────────────────────────────────────────────────────── */

function getPasswordStrength(pw: string) {
  if (!pw) return { label: "", pct: 0, color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: "Weak", pct: 20, color: "bg-rose-500" };
  if (score === 2) return { label: "Fair", pct: 45, color: "bg-amber-400" };
  if (score === 3) return { label: "Good", pct: 65, color: "bg-yellow-400" };
  if (score === 4) return { label: "Strong", pct: 82, color: "bg-emerald-500" };
  return { label: "Very Strong", pct: 100, color: "bg-emerald-600" };
}

const inputCls =
  "w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:bg-zinc-950 dark:focus:border-blue-400 dark:placeholder-zinc-600";

/* ─── sub-components ────────────────────────────────────────────────────────── */

type NavSection = "profile" | "preferences" | "security" | "appearance" | "danger";

const NAV_ITEMS: { id: NavSection; label: string; icon: React.ElementType; danger?: boolean }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "preferences", label: "Fit Preferences", icon: SlidersHorizontal },
  { id: "security", label: "Security", icon: Shield },
  { id: "appearance", label: "Appearance", icon: Moon },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle, danger: true },
];

/* ─── main component ─────────────────────────────────────────────────────────  */

const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [active, setActive] = useState<NavSection>("profile");

  // ── Profile ──
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileSaving, setProfileSaving] = useState(false);

  // ── Fit Preferences ──
  const [homeCity, setHomeCity] = useState(user?.preferences?.homeCity || "");
  const [travelPreference, setTravelPreference] = useState<TravelPreference>(
    user?.preferences?.travelPreference || DEFAULT_PREFERENCES.travelPreference
  );
  const [maxTravelBudgetINR, setMaxTravelBudgetINR] = useState<number>(
    user?.preferences?.maxTravelBudgetINR ?? DEFAULT_PREFERENCES.maxTravelBudgetINR
  );
  const [minPrizeINR, setMinPrizeINR] = useState<number>(
    user?.preferences?.minPrizeINR ?? DEFAULT_PREFERENCES.minPrizeINR
  );
  const [minDaysToPrepare, setMinDaysToPrepare] = useState<number>(
    user?.preferences?.minDaysToPrepare ?? DEFAULT_PREFERENCES.minDaysToPrepare
  );
  const [preferredModes, setPreferredModes] = useState<string[]>(user?.preferences?.preferredModes || []);
  const [preferredPlatforms, setPreferredPlatforms] = useState<string[]>(user?.preferences?.preferredPlatforms || []);
  const [preferredTeamSize, setPreferredTeamSize] = useState<number>(
    user?.preferences?.preferredTeamSize ?? DEFAULT_PREFERENCES.preferredTeamSize
  );
  const [skillsInput, setSkillsInput] = useState((user?.preferences?.skills || []).join(", "));
  const [prefsSaving, setPrefsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setEmail(user.email);
      if (user.preferences) {
        setHomeCity(user.preferences.homeCity || "");
        setTravelPreference(user.preferences.travelPreference || DEFAULT_PREFERENCES.travelPreference);
        setMaxTravelBudgetINR(user.preferences.maxTravelBudgetINR ?? DEFAULT_PREFERENCES.maxTravelBudgetINR);
        setMinPrizeINR(user.preferences.minPrizeINR ?? DEFAULT_PREFERENCES.minPrizeINR);
        setMinDaysToPrepare(user.preferences.minDaysToPrepare ?? DEFAULT_PREFERENCES.minDaysToPrepare);
        setPreferredModes(user.preferences.preferredModes || []);
        setPreferredPlatforms(user.preferences.preferredPlatforms || []);
        setPreferredTeamSize(user.preferences.preferredTeamSize ?? DEFAULT_PREFERENCES.preferredTeamSize);
        setSkillsInput((user.preferences.skills || []).join(", "));
      }
    }
  }, [user]);

  const togglePrefItem = (list: string[], value: string, setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefsSaving(true);
    const prefs: UserPreferences = {
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
    try {
      const updatedUser = await userApi.updatePreferences(prefs);
      saveLocalPreferences(prefs);
      updateUser({ ...user!, ...updatedUser, preferences: updatedUser?.preferences || prefs });
      showToast("Fit preferences updated.", "success");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to update preferences.", "error");
    } finally {
      setPrefsSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await axiosInstance.put("/users/update", { fullName, email });
      if (res.data?.success && res.data?.data) {
        updateUser({ ...user!, fullName: res.data.data.fullName, email: res.data.data.email });
        showToast("Profile updated successfully.", "success");
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to update profile.", "error");
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Security ──
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const strength = getPasswordStrength(newPw);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      showToast("New passwords do not match.", "error");
      return;
    }
    if (newPw.length < 8) {
      showToast("New password must be at least 8 characters.", "error");
      return;
    }
    setPwSaving(true);
    try {
      const res = await axiosInstance.post("/users/change-password", {
        oldPassword: oldPw,
        newPassword: newPw,
      });
      if (res.data?.success) {
        showToast("Password updated successfully.", "success");
        setOldPw(""); setNewPw(""); setConfirmPw("");
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to change password.", "error");
    } finally {
      setPwSaving(false);
    }
  };

  // ── Appearance ──
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      document.documentElement.classList.contains("dark") ||
      localStorage.getItem("theme") === "dark"
    );
  });

  useEffect(() => {
    const onThemeSync = (e: Event) => {
      const detail = (e as CustomEvent<"light" | "dark">).detail;
      setIsDark(detail === "dark");
    };
    window.addEventListener("hackdekh-theme-change", onThemeSync);
    return () => window.removeEventListener("hackdekh-theme-change", onThemeSync);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    window.dispatchEvent(new CustomEvent("hackdekh-theme-change", { detail: next ? "dark" : "light" }));
    showToast(`Switched to ${next ? "dark" : "light"} mode.`, "success");
  };

  // ── Danger zone ──
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await axiosInstance.delete("/users/me");
      showToast("Your account has been deleted.", "success");
      // logout handled by server expiring cookies / auth context
    } catch (err: any) {
      showToast(err.response?.data?.message || "Account deletion is not available yet.", "error");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  /* ── render ── */
  const initials = (user?.fullName || "U").slice(0, 2).toUpperCase();

  return (
    <section className="mx-auto w-full max-w-5xl py-6 px-0">


      <div className="flex gap-10 md:gap-16">
        {/* ── Left sidebar nav ── */}
        <nav className="hidden md:flex flex-col gap-0.5 w-44 shrink-0">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={`relative flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm font-medium text-left transition-colors ${
                  isActive
                    ? item.danger
                      ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
                      : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    : item.danger
                    ? "text-rose-500 hover:bg-rose-50/60 dark:text-rose-400 dark:hover:bg-rose-950/20"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
                }`}
              >
                {isActive && (
                  <span
                    className={`absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full ${
                      item.danger ? "bg-rose-500" : "bg-blue-600 dark:bg-blue-400"
                    }`}
                  />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Mobile tabs (small screens) */}
        <div className="flex md:hidden gap-1 mb-6 flex-wrap w-full">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? item.danger
                      ? "bg-rose-600 text-white"
                      : "bg-blue-600 text-white"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* ── Right content ── */}
        <div className="flex-1 min-w-0 space-y-0">
          {/* PROFILE */}
          {active === "profile" && (
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">Profile</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                Your name and email are shown to teammates and on your profile.
              </p>

              {/* Avatar row */}
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-extrabold text-white shadow-md select-none">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {user?.fullName || "Your Name"}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">@{user?.username || "username"}</p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                    Avatar is auto-generated from your initials.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* Full name */}
                <div className="flex items-start justify-between gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="shrink-0 w-44">
                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 block">
                      Full Name
                    </label>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                      Displayed across the app.
                    </p>
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`${inputCls} max-w-sm`}
                    placeholder="Your full name"
                  />
                </div>

                {/* Email */}
                <div className="flex items-start justify-between gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="shrink-0 w-44">
                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 block">
                      Email Address
                    </label>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                      For login and notifications.
                    </p>
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${inputCls} max-w-sm`}
                    placeholder="you@example.com"
                  />
                </div>

                {/* Username (read-only) */}
                <div className="flex items-start justify-between gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="shrink-0 w-44">
                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 block">
                      Username
                    </label>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                      Cannot be changed. Used for identity.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 max-w-sm w-full">
                    <input
                      type="text"
                      disabled
                      value={user?.username || ""}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm text-zinc-400 outline-none cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-500"
                    />
                    <Lock className="h-4 w-4 text-zinc-400 shrink-0" />
                  </div>
                </div>

                {/* Save row */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="btn btn-primary"
                  >
                    {profileSaving ? <Loader2 className="h-4 w-4 animate-spin text-zinc-400" /> : null}
                    Save changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* FIT PREFERENCES */}
          {active === "preferences" && (
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">Fit Preferences</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                Used by the "Worth It?" check to evaluate travel, team size, and skill fit for every hackathon.
              </p>

              <form onSubmit={handleSavePreferences} className="space-y-5 max-w-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Home City
                    </label>
                    <input
                      type="text"
                      value={homeCity}
                      onChange={(e) => setHomeCity(e.target.value)}
                      placeholder="e.g. Bengaluru, Delhi"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Preferred Team Size
                    </label>
                    <select
                      value={preferredTeamSize}
                      onChange={(e) => setPreferredTeamSize(Number(e.target.value))}
                      className={inputCls}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? "member (Solo)" : "members"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Travel Willingness
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(Object.keys(TRAVEL_PREFERENCE_LABELS) as TravelPreference[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTravelPreference(key)}
                        className={`rounded-lg border px-3.5 py-2.5 text-left text-xs font-semibold transition cursor-pointer ${
                          travelPreference === key
                            ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                            : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                        }`}
                      >
                        {TRAVEL_PREFERENCE_LABELS[key]}
                      </button>
                    ))}
                  </div>
                </div>

                {travelPreference !== "online_only" && travelPreference !== "same_city" && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Max Travel Budget (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={maxTravelBudgetINR}
                      onChange={(e) => setMaxTravelBudgetINR(Number(e.target.value))}
                      className={inputCls}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Minimum Prize Pool (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={5000}
                      value={minPrizeINR}
                      onChange={(e) => setMinPrizeINR(Number(e.target.value))}
                      placeholder="0 for any"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Min Days to Prepare
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={minDaysToPrepare}
                      onChange={(e) => setMinDaysToPrepare(Number(e.target.value))}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Preferred Event Modes <span className="font-normal text-zinc-400">(optional)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_MODES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => togglePrefItem(preferredModes, m, setPreferredModes)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition cursor-pointer ${
                          preferredModes.includes(m)
                            ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                            : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
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
                        onClick={() => togglePrefItem(preferredPlatforms, p, setPreferredPlatforms)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                          preferredPlatforms.includes(p)
                            ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                            : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Primary Skills / Stack (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                    placeholder="e.g. React, Node.js, AI, Python"
                    className={inputCls}
                  />
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={prefsSaving} className="btn btn-primary">
                    {prefsSaving ? <Loader2 className="h-4 w-4 animate-spin text-zinc-400" /> : null}
                    Save preferences
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECURITY */}
          {active === "security" && (
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">Security</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                Change your login password. Use a strong, unique password.
              </p>

              <form onSubmit={handleChangePassword} className="space-y-6">
                {/* Current password */}
                <div className="flex items-start justify-between gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="shrink-0 w-44">
                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 block">
                      Current Password
                    </label>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                      Your existing password.
                    </p>
                  </div>
                  <div className="relative max-w-sm w-full">
                    <input
                      type={showOld ? "text" : "password"}
                      required
                      value={oldPw}
                      onChange={(e) => setOldPw(e.target.value)}
                      className={`${inputCls} pr-10`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOld(!showOld)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* New password + strength */}
                <div className="flex items-start justify-between gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="shrink-0 w-44">
                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 block">
                      New Password
                    </label>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                      Min 8 chars, include symbols.
                    </p>
                  </div>
                  <div className="max-w-sm w-full space-y-2">
                    <div className="relative">
                      <input
                        type={showNew ? "text" : "password"}
                        required
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        className={`${inputCls} pr-10`}
                        placeholder="New password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {newPw && (
                      <div className="space-y-1">
                        <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                            style={{ width: `${strength.pct}%` }}
                          />
                        </div>
                        <p className={`text-xs font-semibold ${
                          strength.pct <= 20 ? "text-rose-500" :
                          strength.pct <= 45 ? "text-amber-500" :
                          strength.pct <= 65 ? "text-yellow-600" : "text-emerald-600"
                        }`}>
                          {strength.label}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Confirm password */}
                <div className="flex items-start justify-between gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="shrink-0 w-44">
                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 block">
                      Confirm Password
                    </label>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                      Must match new password.
                    </p>
                  </div>
                  <div className="max-w-sm w-full space-y-1">
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        required
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                        className={`${inputCls} pr-10 ${
                          confirmPw && confirmPw !== newPw
                            ? "border-rose-400 focus:border-rose-400 dark:border-rose-600"
                            : ""
                        }`}
                        placeholder="Confirm password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPw && confirmPw !== newPw && (
                      <p className="text-xs text-rose-500 font-medium">Passwords do not match.</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={pwSaving || (!!confirmPw && confirmPw !== newPw)}
                    className="btn btn-primary"
                  >
                    {pwSaving ? <Loader2 className="h-4 w-4 animate-spin text-zinc-400" /> : null}
                    Update password
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* APPEARANCE */}
          {active === "appearance" && (
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">Appearance</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                Customize how HackDekh looks to you.
              </p>

              {/* Theme row */}
              <div className="py-4 border-b border-zinc-100 dark:border-zinc-800">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Interface Theme</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Choose between light and dark mode. Your preference is saved locally.
                </p>
              </div>

              {/* Theme cards preview */}
              <div className="mt-6 grid grid-cols-2 gap-3 max-w-sm">
                <button
                  onClick={() => { if (isDark) toggleTheme(); }}
                  className={`rounded-lg border-2 p-3 text-left transition cursor-pointer ${
                    !isDark
                      ? "border-blue-500 shadow-md"
                      : "border-zinc-200 dark:border-zinc-700 opacity-60 hover:opacity-80"
                  }`}
                >
                  <div className="h-16 rounded-lg bg-white border border-zinc-200 mb-2 flex flex-col gap-1 p-2">
                    <div className="h-1.5 w-12 rounded-full bg-zinc-200" />
                    <div className="h-1.5 w-8 rounded-full bg-blue-400" />
                    <div className="mt-1 h-6 w-full rounded bg-zinc-100" />
                  </div>
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Light
                    {!isDark && <span className="ml-1.5 inline-flex items-center gap-1 text-blue-600 dark:text-blue-400"><Check className="h-3 w-3" /> Active</span>}
                  </p>
                </button>

                <button
                  onClick={() => { if (!isDark) toggleTheme(); }}
                  className={`rounded-lg border-2 p-3 text-left transition cursor-pointer ${
                    isDark
                      ? "border-blue-500 shadow-md"
                      : "border-zinc-200 dark:border-zinc-700 opacity-60 hover:opacity-80"
                  }`}
                >
                  <div className="h-16 rounded-lg bg-zinc-900 border border-zinc-700 mb-2 flex flex-col gap-1 p-2">
                    <div className="h-1.5 w-12 rounded-full bg-zinc-700" />
                    <div className="h-1.5 w-8 rounded-full bg-blue-500" />
                    <div className="mt-1 h-6 w-full rounded bg-zinc-800" />
                  </div>
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Dark
                    {isDark && <span className="ml-1.5 inline-flex items-center gap-1 text-blue-400"><Check className="h-3 w-3" /> Active</span>}
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* DANGER ZONE */}
          {active === "danger" && (
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">Danger Zone</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                Irreversible and destructive account actions.
              </p>

              <div className="rounded-lg border border-rose-200 bg-rose-50/30 dark:border-rose-900/50 dark:bg-rose-950/10 divide-y divide-rose-200/60 dark:divide-rose-900/40">
                {/* Delete account */}
                <div className="flex items-center justify-between gap-6 px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      Delete your account
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-sm">
                      Permanently delete your HackDekh account, all your teams and participation data. This action{" "}
                      <strong className="text-rose-600 dark:text-rose-400">cannot</strong> be undone.
                    </p>
                  </div>
                  <button
                    onClick={() => { setDeleteInput(""); setShowDeleteModal(true); }}
                    className="btn shrink-0 border border-rose-200 bg-white text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 dark:bg-transparent dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white dark:hover:border-rose-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Delete Account Confirmation Modal ── */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/65 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/10">
                  <AlertTriangle className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">Delete account?</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">This is permanent and irreversible.</p>
                </div>
              </div>

              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">
                This will permanently delete your account including all teams you own, participation history, and stage reflections. Other members of your teams will lose access.
              </p>

              <div className="space-y-1.5 mb-5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Type your username <span className="font-mono text-zinc-800 dark:text-zinc-200 normal-case">"{user?.username}"</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder={user?.username}
                  className={inputCls}
                  autoFocus
                />
              </div>

              <div className="flex gap-2.5 justify-end">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteInput !== user?.username}
                  className="btn btn-danger"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete my account
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default SettingsPage;
