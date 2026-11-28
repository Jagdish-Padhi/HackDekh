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
  LogOut,
  ChevronRight,
  ChevronLeft,
  Smartphone,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth, type TravelPreference, type UserPreferences } from "../context/AuthContext";
import { useCache, useToast } from "../context";
import { userApi } from "../services";
import {
  AVAILABLE_MODES,
  AVAILABLE_PLATFORMS,
  DEFAULT_PREFERENCES,
  saveLocalPreferences,
  TRAVEL_PREFERENCE_LABELS,
} from "../utils/fitEngine";
import axiosInstance from "../utils/axiosInstance";
import { useSeo } from "../utils/useSeo";
import { AnimatePresence, motion } from "framer-motion";
import posthog, { isPostHogEnabled } from "../posthog";

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
  "w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-800 outline-none transition hover:border-zinc-300 focus:border-blue-500/70 focus:bg-white focus:ring-3 focus:ring-blue-500/12 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-700 dark:focus:bg-zinc-950 dark:focus:border-blue-500/60 dark:focus:ring-blue-500/15 dark:placeholder-zinc-600";

/* ─── sub-components ────────────────────────────────────────────────────────── */

type NavSection = "profile" | "preferences" | "security" | "appearance" | "danger";

const NAV_ITEMS: { id: NavSection; label: string; subtitle: string; icon: React.ElementType; danger?: boolean }[] = [
  { id: "profile", label: "Profile", subtitle: "Name, email & username", icon: User },
  { id: "preferences", label: "Fit Preferences", subtitle: "City, travel, skills & 24h alerts", icon: SlidersHorizontal },
  { id: "security", label: "Security", subtitle: "Update your password", icon: Shield },
  { id: "appearance", label: "Appearance", subtitle: "Light or dark theme", icon: Moon },
  { id: "danger", label: "Danger Zone", subtitle: "Delete your account", icon: AlertTriangle, danger: true },
];

/* ─── main component ─────────────────────────────────────────────────────────  */

const SettingsPage = () => {
  useSeo({
    title: "Settings | HackDekh",
    description: "Manage your profile, fit preferences, 24h deadline alert channels, and theme.",
    path: "/settings",
    noIndex: true,
  });
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const { clearCache } = useCache();
  const { showToast } = useToast();
  const [active, setActive] = useState<NavSection>("profile");
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
  });
  const isIosSafari =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream;

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    const onInstalled = () => {
      setIsStandalone(true);
      setInstallPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!installPromptEvent) return;
    await installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;
    if (choice?.outcome === "accepted") {
      setInstallPromptEvent(null);
      showToast("Installing HackDekh app...", "success");
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // fallback
    } finally {
      clearCache();
      sessionStorage.removeItem("dismissedSignupFunnel");
      navigate("/login");
    }
  };

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
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState<boolean>(
    (user?.preferences as any)?.emailAlertsEnabled ?? true
  );
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState<string>(
    (user?.preferences as any)?.discordWebhookUrl || ""
  );
  const [telegramChatId, setTelegramChatId] = useState<string>(
    (user?.preferences as any)?.telegramChatId || ""
  );
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [sendingTestAlert, setSendingTestAlert] = useState(false);

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
        setEmailAlertsEnabled((user.preferences as any).emailAlertsEnabled ?? true);
        setDiscordWebhookUrl((user.preferences as any).discordWebhookUrl || "");
        setTelegramChatId((user.preferences as any).telegramChatId || "");
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
      const updatedUser = await userApi.updatePreferences({
        ...prefs,
        emailAlertsEnabled,
        discordWebhookUrl: discordWebhookUrl.trim(),
        telegramChatId: telegramChatId.trim(),
      });
      saveLocalPreferences(prefs);
      updateUser({ ...user!, ...updatedUser, preferences: updatedUser?.preferences || prefs });
      showToast("Fit preferences updated.", "success");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to update preferences.", "error");
    } finally {
      setPrefsSaving(false);
    }
  };

  const handleSendTestAlert = async () => {
    setSendingTestAlert(true);
    try {
      await userApi.sendTestAlert({
        emailAlertsEnabled,
        discordWebhookUrl: discordWebhookUrl.trim(),
        telegramChatId: telegramChatId.trim(),
      });
      showToast("Test alert dispatched to your active channel(s).", "success");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to send test alert.", "error");
    } finally {
      setSendingTestAlert(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await axiosInstance.put("/users/update", { fullName, email });
      if (res.data?.success && res.data?.data) {
        updateUser({ ...user!, fullName: res.data.data.fullName, email: res.data.data.email });
        if (isPostHogEnabled) {
          posthog.capture('profile_updated');
        }
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
        if (isPostHogEnabled) {
          posthog.capture('password_changed');
        }
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
      if (isPostHogEnabled) {
        posthog.capture('account_deleted');
      }
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
    <section className="mx-auto w-full max-w-5xl px-1 sm:px-2 py-2 sm:py-5">
      <div className="flex flex-col md:flex-row gap-5 md:gap-12 lg:gap-16">
        {/* ── Left sidebar nav (desktop) ── */}
        <nav className="hidden md:flex flex-col gap-0.5 w-44 shrink-0">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={`relative flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm font-medium text-left transition-colors cursor-pointer ${
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

        {/* Mobile Native Settings List (shown when no sub-page is open) */}
        {!mobileShowDetail && (
          <div className="md:hidden space-y-4 w-full">
            {/* Account Summary Card */}
            <button
              type="button"
              onClick={() => { setActive("profile"); setMobileShowDetail(true); }}
              className="w-full flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-xs transition active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-900/60"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-base font-extrabold text-white shadow-sm select-none">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {user?.fullName || "Your Name"}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    @{user?.username || "username"} • {user?.email || ""}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
            </button>

            {/* Primary Settings List */}
            <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100 overflow-hidden shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60 dark:divide-zinc-800/80">
              {NAV_ITEMS.filter((item) => !item.danger).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { setActive(item.id); setMobileShowDetail(true); }}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-zinc-800/50 dark:active:bg-zinc-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {item.label}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
                  </button>
                );
              })}
            </div>

            {/* Install App Card (shown only when not already running as installed app) */}
            {!isStandalone && (installPromptEvent || isIosSafari) && (
              <div className="rounded-xl border border-blue-200/80 bg-blue-50/60 p-3.5 dark:border-blue-900/50 dark:bg-blue-950/25 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Install HackDekh App
                    </p>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
                      {installPromptEvent
                        ? "Add to home screen for full-screen app feel"
                        : "Tap Share → Add to Home Screen"}
                    </p>
                  </div>
                </div>
                {installPromptEvent && (
                  <button
                    type="button"
                    onClick={handleInstallApp}
                    className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95"
                  >
                    Install
                  </button>
                )}
              </div>
            )}

            {/* Danger & Session Group */}
            <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100 overflow-hidden shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60 dark:divide-zinc-800/80">
              {NAV_ITEMS.filter((item) => item.danger).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { setActive(item.id); setMobileShowDetail(true); }}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-rose-50/40 active:bg-rose-50 dark:hover:bg-rose-950/20"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 truncate">
                          {item.label}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
                  </button>
                );
              })}

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-rose-50/40 active:bg-rose-50 dark:hover:bg-rose-950/20"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-rose-600 dark:bg-zinc-800 dark:text-rose-400">
                    {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                      Log out
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      Sign out of your account on this device
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── Right content ── */}
        <div className={`flex-1 min-w-0 space-y-0 ${mobileShowDetail ? "block" : "hidden md:block"}`}>
          {/* Mobile Detail Back Header */}
          <div className="md:hidden mb-4 pb-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
            <button
              type="button"
              onClick={() => setMobileShowDetail(false)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 active:opacity-75"
            >
              <ChevronLeft className="h-4 w-4" />
              Settings
            </button>
          </div>
          {/* PROFILE */}
          {active === "profile" && (
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">Profile</h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-5 sm:mb-6">
                Your name and email are shown to teammates and on your profile.
              </p>

              {/* Avatar row */}
              <div className="flex items-center gap-3.5 sm:gap-4 mb-6 sm:mb-8 pb-5 sm:pb-6 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-lg sm:text-xl font-extrabold text-white shadow-md select-none">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                    {user?.fullName || "Your Name"}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">@{user?.username || "username"}</p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                    Avatar is auto-generated from your initials.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5 sm:space-y-6">
                {/* Full name */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-6 pb-5 sm:pb-6 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="w-full sm:w-44 shrink-0">
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
                    className={`${inputCls} sm:max-w-sm`}
                    placeholder="Your full name"
                  />
                </div>

                {/* Email */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-6 pb-5 sm:pb-6 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="w-full sm:w-44 shrink-0">
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
                    className={`${inputCls} sm:max-w-sm`}
                    placeholder="you@example.com"
                  />
                </div>

                {/* Username (read-only) */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-6 pb-5 sm:pb-6 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="w-full sm:w-44 shrink-0">
                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 block">
                      Username
                    </label>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                      Cannot be changed. Used for identity.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:max-w-sm">
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
                <div className="flex justify-end pt-1 sm:pt-2">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="btn btn-primary w-full sm:w-auto justify-center"
                  >
                    {profileSaving ? <Loader2 className="h-4 w-4 animate-spin text-zinc-400" /> : null}
                    Save changes
                  </button>
                </div>
              </form>

              {/* Session / Logout */}
              <div className="mt-8 pt-6 border-t border-zinc-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Sign out
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Log out of your HackDekh account on this device.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="btn w-full sm:w-auto justify-center shrink-0 border border-zinc-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-rose-400 dark:hover:bg-rose-950/30 dark:hover:border-rose-900/50 transition-colors cursor-pointer"
                >
                  {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  Log out
                </button>
              </div>
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
                        <option key={n} value={n} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(Object.keys(TRAVEL_PREFERENCE_LABELS) as TravelPreference[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTravelPreference(key)}
                        className={`rounded-lg border px-3.5 py-2.5 text-left text-xs font-semibold transition cursor-pointer ${
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
                        onClick={() => togglePrefItem(preferredPlatforms, p, setPreferredPlatforms)}
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

                {/* Deadline Alert Channels */}
                <div className="pt-4 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">24h Deadline Alert Channels</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Choose where HackDekh notifies you 24 hours before a tracked hackathon deadline.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={sendingTestAlert}
                      onClick={handleSendTestAlert}
                      className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 sm:py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 cursor-pointer shrink-0"
                    >
                      {sendingTestAlert ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Send Test Alert
                    </button>
                  </div>

                  <label className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/50 cursor-pointer">
                    <div>
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">Email Reminders</span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Sent to {user?.email || "your account email"}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={emailAlertsEnabled}
                      onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Discord Webhook URL (optional)
                      </label>
                      <input
                        type="url"
                        value={discordWebhookUrl}
                        onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                        placeholder="https://discord.com/api/webhooks/..."
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Telegram Chat ID (optional)
                      </label>
                      <input
                        type="text"
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        placeholder="e.g. 123456789"
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={prefsSaving} className="btn btn-primary w-full sm:w-auto justify-center">
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
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-5 sm:mb-6">
                Change your login password. Use a strong, unique password.
              </p>

              <form onSubmit={handleChangePassword} className="space-y-5 sm:space-y-6">
                {/* Current password */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-6 pb-5 sm:pb-6 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="w-full sm:w-44 shrink-0">
                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 block">
                      Current Password
                    </label>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                      Your existing password.
                    </p>
                  </div>
                  <div className="relative w-full sm:max-w-sm">
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
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-6 pb-5 sm:pb-6 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="w-full sm:w-44 shrink-0">
                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 block">
                      New Password
                    </label>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                      Min 8 chars, include symbols.
                    </p>
                  </div>
                  <div className="w-full sm:max-w-sm space-y-2">
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
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-6 pb-5 sm:pb-6 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="w-full sm:w-44 shrink-0">
                    <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 block">
                      Confirm Password
                    </label>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                      Must match new password.
                    </p>
                  </div>
                  <div className="w-full sm:max-w-sm space-y-1">
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

                <div className="flex justify-end pt-1 sm:pt-2">
                  <button
                    type="submit"
                    disabled={pwSaving || (!!confirmPw && confirmPw !== newPw)}
                    className="btn btn-primary w-full sm:w-auto justify-center"
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
              <div className="py-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
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
                      ? "border-blue-500/80 shadow-md"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 opacity-60 hover:opacity-85"
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
                      ? "border-blue-500/80 shadow-md"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 opacity-60 hover:opacity-85"
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
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-5 sm:mb-6">
                Irreversible and destructive account actions.
              </p>

              <div className="rounded-lg border border-rose-200 bg-rose-50/30 dark:border-rose-900/50 dark:bg-rose-950/10 divide-y divide-rose-200/60 dark:divide-rose-900/40">
                {/* Delete account */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 sm:px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      Delete your account
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-sm leading-relaxed">
                      Permanently delete your HackDekh account, all your teams and participation data. This action{" "}
                      <strong className="text-rose-600 dark:text-rose-400">cannot</strong> be undone.
                    </p>
                  </div>
                  <button
                    onClick={() => { setDeleteInput(""); setShowDeleteModal(true); }}
                    className="btn w-full sm:w-auto justify-center shrink-0 border border-rose-200 bg-white text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 dark:bg-transparent dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white dark:hover:border-rose-600 transition-colors cursor-pointer"
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
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-zinc-950/65 backdrop-blur-sm p-0 sm:p-4">
            <motion.div
              initial={{ y: 20, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 20, scale: 0.96, opacity: 0 }}
              className="w-full sm:max-w-md rounded-t-2xl sm:rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6 shadow-2xl"
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
