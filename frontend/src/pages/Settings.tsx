import { useEffect, useState } from "react";
import { 
  Shield, 
  Bell, 
  UserCog, 
  Check, 
  X, 
  User, 
  Lock 
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../utils/axiosInstance";
import LogoTransition from "../components/LogoAnimation";

type ProfileMessage = { type: "success" | "error"; text: string };

const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "notifications">("profile");

  // Profile states
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<ProfileMessage | null>(null);

  // Security states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<ProfileMessage | null>(null);

  // Notifications placeholder
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [teamInvites, setTeamInvites] = useState(true);
  const [stageDeadlines, setStageDeadlines] = useState(true);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setEmail(user.email);
    }
  }, [user]);

  const handleUpdateProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileLoading(true);
    setProfileMessage(null);
    try {
      const res = await axiosInstance.put("/users/update", { fullName, email });
      if (res.data?.success && res.data?.data) {
        updateUser({
          ...user!,
          fullName: res.data.data.fullName,
          email: res.data.data.email,
        });
        setProfileMessage({ type: "success", text: "Profile details updated successfully." });
      }
    } catch (error: any) {
      console.error(error);
      setProfileMessage({ type: "error", text: error.response?.data?.message || "Failed to update profile details." });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await axiosInstance.post("/users/change-password", { oldPassword, newPassword });
      if (res.data?.success) {
        setPasswordMessage({ type: "success", text: "Password changed successfully." });
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error: any) {
      console.error(error);
      setPasswordMessage({ type: "error", text: error.response?.data?.message || "Failed to change password." });
    } finally {
      setPasswordLoading(false);
    }
  };

  const tabs = [
    { id: "profile" as const, label: "Profile Settings", icon: UserCog, desc: "Personal info and email identity" },
    { id: "security" as const, label: "Security & Passwords", icon: Shield, desc: "Account login security settings" },
    { id: "notifications" as const, label: "Notifications", icon: Bell, desc: "Email alerts and reminder configs" },
  ];

  return (
    <section className="mx-auto w-full max-w-5xl py-2 space-y-6">
      {/* Main layout */}
      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        {/* Navigation Sidebar panel */}
        <div className="flex flex-col gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full flex-col gap-0.5 rounded-[1.4rem] border p-4 text-left transition-all ${
                  isActive
                    ? "border-blue-500/20 bg-blue-600/10 text-zinc-900 dark:text-white"
                    : "border-zinc-200 bg-white hover:bg-zinc-50/50 text-zinc-500 hover:text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-zinc-900/40 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Icon className={`h-4.5 w-4.5 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-zinc-400"}`} />
                  {tab.label}
                </div>
                <span className="text-[10px] opacity-80 leading-normal pl-6">{tab.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content area */}
        <div className="min-w-0">
          {activeTab === "profile" && (
            <div className="rounded-[2.2rem] border border-zinc-200/90 bg-white p-6 shadow-sm backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/80 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Personal Information</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Update your public name and email.</p>
                </div>
              </div>

              {profileMessage && (
                <div className={`mb-5 flex items-center gap-3 rounded-2xl border p-4 text-xs font-semibold ${
                  profileMessage.type === "success" 
                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400" 
                    : "border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400"
                }`}>
                  {profileMessage.type === "success" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  {profileMessage.text}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:bg-zinc-950"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Username</label>
                    <input
                      type="text"
                      disabled
                      value={user?.username || ""}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm text-zinc-400 outline-none dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:bg-zinc-950"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={profileLoading} 
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 text-sm font-bold shadow-xs transition duration-200 cursor-pointer disabled:opacity-60"
                  >
                    {profileLoading && <LogoTransition width={28} height={18} loop={true} />}
                    Save details
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "security" && (
            <div className="rounded-[2.2rem] border border-zinc-200/90 bg-white p-6 shadow-sm backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/80 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Security Credentials</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Change your password and authentication codes.</p>
                </div>
              </div>

              {passwordMessage && (
                <div className={`mb-5 flex items-center gap-3 rounded-2xl border p-4 text-xs font-semibold ${
                  passwordMessage.type === "success" 
                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400" 
                    : "border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400"
                }`}>
                  {passwordMessage.type === "success" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  {passwordMessage.text}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Current Password</label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(event) => setOldPassword(event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:bg-zinc-950"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:bg-zinc-950"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:bg-zinc-950"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={passwordLoading} 
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 text-sm font-bold shadow-xs transition duration-200 cursor-pointer disabled:opacity-60"
                  >
                    {passwordLoading && <LogoTransition width={28} height={18} loop={true} />}
                    Change Password
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="rounded-[2.2rem] border border-zinc-200/90 bg-white p-6 shadow-sm backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/80 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Preferences & Alerts</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Choose when and how we keep you updated.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div>
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Email Notifications</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Receive summaries, platform news, and tips.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="h-4 w-4 rounded-sm border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-700"
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div>
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Team Invites</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Alert me when a user invites me to join their roster.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={teamInvites}
                    onChange={(e) => setTeamInvites(e.target.checked)}
                    className="h-4 w-4 rounded-sm border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-700"
                  />
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Stage Deadlines</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Send reminder alerts when Stage submission deadlines approach.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={stageDeadlines}
                    onChange={(e) => setStageDeadlines(e.target.checked)}
                    className="h-4 w-4 rounded-sm border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-700"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default SettingsPage;
