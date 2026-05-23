import { useEffect, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { 
  Bookmark, Trash2, Award, Settings, User, Lock, 
  Mail, Check, AlertCircle, Loader2, ArrowUpRight 
} from "lucide-react";
import axiosInstance from "../utils/axiosInstance";
import { useAuth } from "../context/AuthContext";
import HackathonCard from "../components/HackathonCard";

type HackathonType = {
  _id: string;
  title: string;
  platform: string;
  coverImage?: string;
  startDate?: string;
  deadline?: string;
  mode?: string;
  prize?: string;
  location?: string;
  applyLink?: string;
};

type ApplicationType = {
  _id: string;
  hackathon: HackathonType;
  status: "Applied" | "Accepted" | "Rejected" | "Under Review" | "Completed" | string;
  notes: string;
  appliedAt: string;
};

export default function DashboardPage() {
  const { user, updateUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "bookmarks";

  // Data states
  const [savedHackathons, setSavedHackathons] = useState<HackathonType[]>([]);
  const [applications, setApplications] = useState<ApplicationType[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Settings form states
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password form states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Track active note editing state to show auto-saved indicator
  const [noteSavingStatus, setNoteSavingStatus] = useState<Record<string, "saved" | "saving" | "error">>({});

  // Sync profile details if user changes/loads
  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setEmail(user.email);
    }
  }, [user]);

  // Load bookmarks & applications
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [savedRes, appsRes] = await Promise.all([
          axiosInstance.get("/users/saved"),
          axiosInstance.get("/users/applications")
        ]);

        if (isMounted) {
          setSavedHackathons(savedRes.data?.data || savedRes.data || []);
          setApplications(appsRes.data?.data || appsRes.data || []);
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        if (isMounted) {
          setLoadingData(false);
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Set active tab
  const handleTabChange = (tabName: string) => {
    setSearchParams({ tab: tabName });
  };

  // Bookmark actions
  const handleRemoveBookmark = async (hackathonId: string) => {
    try {
      const res = await axiosInstance.post(`/users/saved/${hackathonId}`);
      if (res.data?.success && res.data?.data) {
        // Update user context
        updateUser({
          ...user!,
          savedHackathons: res.data.data.savedHackathons
        });
        // Remove locally
        setSavedHackathons(prev => prev.filter(hack => hack._id !== hackathonId));
      }
    } catch (err) {
      console.error("Failed to remove bookmark", err);
    }
  };

  // Application Tracker actions
  const handleUpdateAppStatus = async (appId: string, nextStatus: string) => {
    try {
      const res = await axiosInstance.put(`/users/applications/${appId}`, {
        status: nextStatus
      });
      if (res.data?.success && res.data?.data) {
        const updatedApp = res.data.data;
        setApplications(prev => prev.map(app => app._id === appId ? { ...app, status: updatedApp.status } : app));
        
        // Sync context
        const updatedUserApps = user!.applications.map(app => 
          app._id === appId ? { ...app, status: updatedApp.status } : app
        );
        updateUser({ ...user!, applications: updatedUserApps });
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleUpdateAppNotes = async (appId: string, notes: string) => {
    setNoteSavingStatus(prev => ({ ...prev, [appId]: "saving" }));
    try {
      const res = await axiosInstance.put(`/users/applications/${appId}`, { notes });
      if (res.data?.success && res.data?.data) {
        setNoteSavingStatus(prev => ({ ...prev, [appId]: "saved" }));
        
        // Sync context and local state
        const updatedApp = res.data.data;
        setApplications(prev => prev.map(app => app._id === appId ? { ...app, notes: updatedApp.notes } : app));
        const updatedUserApps = user!.applications.map(app => 
          app._id === appId ? { ...app, notes: updatedApp.notes } : app
        );
        updateUser({ ...user!, applications: updatedUserApps });
      }
    } catch (err) {
      console.error("Failed to save note", err);
      setNoteSavingStatus(prev => ({ ...prev, [appId]: "error" }));
    }
  };

  const handleRemoveApp = async (appId: string) => {
    if (!window.confirm("Are you sure you want to stop tracking this application?")) return;
    try {
      const res = await axiosInstance.delete(`/users/applications/${appId}`);
      if (res.data?.success) {
        setApplications(prev => prev.filter(app => app._id !== appId));
        
        // Sync context
        const updatedUserApps = user!.applications.filter(app => app._id !== appId);
        updateUser({ ...user!, applications: updatedUserApps });
      }
    } catch (err) {
      console.error("Failed to remove application", err);
    }
  };

  // Settings form handlers
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage(null);
    try {
      const res = await axiosInstance.put("/users/update", { fullName, email });
      if (res.data?.success && res.data?.data) {
        const updatedUser = res.data.data;
        updateUser({
          ...user!,
          fullName: updatedUser.fullName,
          email: updatedUser.email
        });
        setProfileMessage({ type: "success", text: "Profile details updated successfully!" });
      }
    } catch (err: any) {
      console.error(err);
      setProfileMessage({ 
        type: "error", 
        text: err.response?.data?.message || "Failed to update profile details." 
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await axiosInstance.post("/users/change-password", {
        oldPassword,
        newPassword
      });
      if (res.data?.success) {
        setPasswordMessage({ type: "success", text: "Password changed successfully!" });
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      console.error(err);
      setPasswordMessage({ 
        type: "error", 
        text: err.response?.data?.message || "Failed to change password. Double check current password." 
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Stats derivation
  const stats = useMemo(() => {
    const totalBookmarked = savedHackathons.length;
    const totalApplied = applications.length;
    const acceptedCount = applications.filter(app => /^accepted$/i.test(app.status)).length;
    const underReviewCount = applications.filter(app => /^under review$/i.test(app.status)).length;

    return {
      totalBookmarked,
      totalApplied,
      acceptedCount,
      underReviewCount
    };
  }, [savedHackathons, applications]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 md:px-6">
      
      {/* Premium Welcome Panel */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-indigo-950 to-zinc-950 p-6 shadow-xl dark:border dark:border-zinc-800/80 md:p-10">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />
        
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/20 text-xl font-black uppercase text-blue-400 border border-blue-500/30">
                {user?.fullName?.slice(0, 2) || "HK"}
              </span>
              <div>
                <p className="text-xs font-semibold tracking-wider uppercase text-blue-400">Personal Dashboard</p>
                <h1 className="text-2xl font-black tracking-tight text-white md:text-4xl">
                  Hey, {user?.fullName}! 👋
                </h1>
              </div>
            </div>
            <p className="text-sm text-zinc-400">
              Manage your saved events, log applications, and check your profile status from your dashboard.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Link 
              to="/hackathons"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 hover:shadow-blue-500/35 hover:-translate-y-0.5"
            >
              Explore Hackathons
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="relative z-10 mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl bg-white/5 p-4 backdrop-blur-md border border-white/5 hover:border-white/10 transition-colors">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Bookmarks</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{stats.totalBookmarked}</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-4 backdrop-blur-md border border-white/5 hover:border-white/10 transition-colors">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Applications</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{stats.totalApplied}</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-4 backdrop-blur-md border border-white/5 hover:border-white/10 transition-colors">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Accepted</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-400">{stats.acceptedCount}</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-4 backdrop-blur-md border border-white/5 hover:border-white/10 transition-colors">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Under Review</p>
            <p className="mt-1 text-2xl font-extrabold text-amber-400">{stats.underReviewCount}</p>
          </div>
        </div>
      </div>

      {/* Tabs Selector Navigation */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto scrollbar-none gap-2">
        <button
          onClick={() => handleTabChange("bookmarks")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all shrink-0 ${
            activeTab === "bookmarks"
              ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          <Bookmark className="h-4.5 w-4.5" />
          Bookmarks
        </button>
        
        <button
          onClick={() => handleTabChange("tracker")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all shrink-0 ${
            activeTab === "tracker"
              ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          <Award className="h-4.5 w-4.5" />
          Application Tracker
        </button>
        
        <button
          onClick={() => handleTabChange("settings")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all shrink-0 ${
            activeTab === "settings"
              ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          <Settings className="h-4.5 w-4.5" />
          Settings
        </button>
      </div>

      {/* Tab Contents */}
      <div className="min-h-[40vh]">
        {loadingData ? (
          <div className="flex h-60 w-full flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-500" />
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Loading your dashboard info...</p>
          </div>
        ) : (
          <div>
            {/* BOOKMARKS TAB */}
            {activeTab === "bookmarks" && (
              <div className="space-y-6">
                {savedHackathons.length === 0 ? (
                  <div className="rounded-[2rem] border border-dashed border-zinc-300 dark:border-zinc-800 p-12 text-center bg-zinc-50/50 dark:bg-zinc-950/20">
                    <Bookmark className="mx-auto h-12 w-12 text-zinc-400" />
                    <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">No saved hackathons yet</h3>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto">
                      Bookmark hackathons to track them easily. They will show up in this space.
                    </p>
                    <Link
                      to="/hackathons"
                      className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition"
                    >
                      Browse Hackathons
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                    {savedHackathons.map((hack, index) => (
                      <div key={hack._id} className="relative group">
                        <HackathonCard hackathon={hack} displayIndex={index} />
                        
                        {/* Quick remove action button */}
                        <button
                          onClick={() => handleRemoveBookmark(hack._id)}
                          className="absolute right-6 top-6 z-20 flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/90 text-white shadow-md border border-rose-400/20 hover:scale-105 hover:bg-rose-600 focus:outline-none transition-all duration-200"
                          title="Remove Bookmark"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* APPLICATION TRACKER TAB */}
            {activeTab === "tracker" && (
              <div className="space-y-6">
                {applications.length === 0 ? (
                  <div className="rounded-[2rem] border border-dashed border-zinc-300 dark:border-zinc-800 p-12 text-center bg-zinc-50/50 dark:bg-zinc-950/20">
                    <Award className="mx-auto h-12 w-12 text-zinc-400" />
                    <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">Tracking empty</h3>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto">
                      You are not tracking any applications yet. Add them from the hackathon details pages to track statuses.
                    </p>
                    <Link
                      to="/hackathons"
                      className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition"
                    >
                      Browse Hackathons
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-[2rem] border border-zinc-200/90 bg-white/70 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30 backdrop-blur-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/20 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          <th className="px-6 py-4">Hackathon</th>
                          <th className="px-6 py-4">Date Applied</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Notes</th>
                          <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {applications.map((app) => {
                          const hack = app.hackathon;
                          if (!hack) return null;

                          return (
                            <tr key={app._id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10 transition-colors">
                              {/* Hackathon Meta info */}
                              <td className="px-6 py-4 max-w-sm">
                                <div className="flex items-center gap-4">
                                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                                    <img 
                                      src={hack.coverImage || "/BrandImages/HackDekh.png"} 
                                      alt={hack.title} 
                                      className="h-full w-full object-cover" 
                                      onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = "/BrandImages/HackDekh.png";
                                      }}
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <Link 
                                      to={`/hackathons/${hack._id}`}
                                      className="block truncate text-sm font-bold text-zinc-800 hover:text-blue-600 dark:text-zinc-200 dark:hover:text-blue-400 transition"
                                    >
                                      {hack.title}
                                    </Link>
                                    <span className="inline-flex rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50 mt-1">
                                      {hack.platform}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Applied date */}
                              <td className="px-6 py-4 text-xs font-semibold text-zinc-600 dark:text-zinc-450 font-mono">
                                {new Date(app.appliedAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric"
                                })}
                              </td>

                              {/* Status select dropdown */}
                              <td className="px-6 py-4">
                                <div className="relative inline-block">
                                  <select
                                    value={app.status}
                                    onChange={(e) => handleUpdateAppStatus(app._id, e.target.value)}
                                    className={`appearance-none rounded-xl border px-3 py-1.5 pr-8 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                                      app.status === "Accepted"
                                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                        : app.status === "Rejected"
                                        ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-450"
                                        : app.status === "Under Review"
                                        ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                                        : app.status === "Completed"
                                        ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                                        : "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
                                    }`}
                                  >
                                    <option value="Applied">Applied</option>
                                    <option value="Under Review">Under Review</option>
                                    <option value="Accepted">Accepted</option>
                                    <option value="Rejected">Rejected</option>
                                    <option value="Completed">Completed</option>
                                  </select>
                                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs opacity-75">
                                    ▼
                                  </span>
                                </div>
                              </td>

                              {/* Notes auto-saving textbox */}
                              <td className="px-6 py-4 max-w-xs">
                                <div className="relative flex items-center">
                                  <input
                                    type="text"
                                    defaultValue={app.notes}
                                    placeholder="Add progress log / notes..."
                                    onBlur={(e) => handleUpdateAppNotes(app._id, e.target.value)}
                                    className="w-full rounded-xl border border-zinc-200 bg-white/50 px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                  <div className="absolute right-2 text-[0.65rem] font-bold">
                                    {noteSavingStatus[app._id] === "saving" && (
                                      <span className="text-blue-500">Saving...</span>
                                    )}
                                    {noteSavingStatus[app._id] === "saved" && (
                                      <span className="text-emerald-500 flex items-center"><Check className="h-3.5 w-3.5" /></span>
                                    )}
                                    {noteSavingStatus[app._id] === "error" && (
                                      <span className="text-rose-500">Error</span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={() => handleRemoveApp(app._id)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 hover:bg-rose-500/10 hover:text-rose-500 transition"
                                  title="Delete Tracking"
                                >
                                  <Trash2 className="h-4.5 w-4.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === "settings" && (
              <div className="grid gap-6 md:grid-cols-2">
                
                {/* Profile update form */}
                <div className="rounded-[2rem] border border-zinc-200/90 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 backdrop-blur-xl md:p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Personal Information</h2>
                      <p className="text-xs text-zinc-650 dark:text-zinc-400">Update your identity and account email.</p>
                    </div>
                  </div>

                  {profileMessage && (
                    <div className={`mb-5 flex items-center gap-3 rounded-2xl p-4 text-xs font-semibold border ${
                      profileMessage.type === "success" 
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                        : "bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400"
                    }`}>
                      {profileMessage.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                      {profileMessage.text}
                    </div>
                  )}

                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">Full Name</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200 focus:bg-white dark:focus:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 pl-10 pr-4 py-3 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200 focus:bg-white dark:focus:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-60"
                    >
                      {profileLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Save Details
                    </button>
                  </form>
                </div>

                {/* Password change form */}
                <div className="rounded-[2rem] border border-zinc-200/90 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 backdrop-blur-xl md:p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Security Credentials</h2>
                      <p className="text-xs text-zinc-650 dark:text-zinc-400">Change your password frequently for better safety.</p>
                    </div>
                  </div>

                  {passwordMessage && (
                    <div className={`mb-5 flex items-center gap-3 rounded-2xl p-4 text-xs font-semibold border ${
                      passwordMessage.type === "success" 
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                        : "bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-450"
                    }`}>
                      {passwordMessage.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                      {passwordMessage.text}
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">Current Password</label>
                      <input
                        type="password"
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200 focus:bg-white dark:focus:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">New Password</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200 focus:bg-white dark:focus:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200 focus:bg-white dark:focus:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-60"
                    >
                      {passwordLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Change Password
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
