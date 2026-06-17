import { useEffect, useMemo, useState, useRef } from "react";
import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Calendar,
  Copy,
  ExternalLink,
  Plus,
  Trash2,
  Users,
  CalendarRange,
  Flag,
  Search,
  CheckCircle2,
  XCircle,
  Info,
  X,
  Github,
  Star,
  AlertTriangle,
  RotateCcw,
  Check,
  Mail,
  UserPlus,
  Key,
  Sparkles
} from "lucide-react";
import { useAuth, useCache, useToast } from "../context";
import { usePageChrome } from "../context/pageChrome";
import { teamApi, userApi } from "../services";
import LogoTransition from "../components/LogoAnimation";
import AppDropdown from "../components/AppDropdown";
import type { GeneratedInvitationLink, Team, TeamHackathon, Stage, TeamInvitation, UserLite } from "../types";
import { motion, AnimatePresence } from "framer-motion";

// ─── Filter option definitions ────────────────────────────────────────────────
const TEAM_PLATFORM_OPTIONS = [
  { label: 'All Platforms', value: '' },
  { label: 'Devpost', value: 'devpost' },
  { label: 'Devfolio', value: 'devfolio' },
  { label: 'Unstop', value: 'unstop' },
  { label: 'MLH', value: 'mlh' },
]

const TEAM_STATUS_OPTIONS = [
  { label: 'All Teams', value: '' },
  { label: 'Active Competing', value: 'active' },
  { label: 'Winner Teams', value: 'winners' },
]

const TEAM_SORT_OPTIONS = [
  { label: 'Default Order', value: '' },
  { label: 'Highest Win Rate', value: 'winrate' },
  { label: 'Most Participations', value: 'participations' },
]

const teamTabs = ["Hackathons", "Members", "Stages", "Settings"] as const;

export const isRegistrationStage = (name: string): boolean => {
  return /register|registration|apply|application|prep|regn/i.test(name);
};

export const getCanonicalStageName = (name: string): string => {
  const val = name.trim().toLowerCase();
  
  const numWords: Record<string, string> = {
    'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
    'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
    'first': '1', 'second': '2', 'third': '3', 'fourth': '4', 'fifth': '5',
    'sixth': '6', 'seventh': '7', 'eighth': '8', 'ninth': '9', 'tenth': '10',
    '1st': '1', '2nd': '2', '3rd': '3', '4th': '4', '5th': '5',
    '6th': '6', '7th': '7', '8th': '8', '9th': '9', '10th': '10'
  };

  const rawTokens = val.split(/[^a-z0-9]+/);
  const processedTokens: string[] = [];

  for (const rawToken of rawTokens) {
    if (!rawToken) continue;
    
    let token = rawToken;
    
    if (numWords[token]) {
      token = numWords[token];
    } else {
      switch (token) {
        case 'i': token = '1'; break;
        case 'ii': token = '2'; break;
        case 'iii': token = '3'; break;
        case 'iv': token = '4'; break;
        case 'v': token = '5'; break;
        case 'vi': token = '6'; break;
        case 'vii': token = '7'; break;
        case 'viii': token = '8'; break;
        case 'ix': token = '9'; break;
        case 'x': token = '10'; break;
      }
    }

    if (/^\d+$/.test(token)) {
      token = parseInt(token, 10).toString();
    }

    processedTokens.push(token);
  }

  processedTokens.sort();
  return processedTokens.join('');
};

type WorkspaceTab = (typeof teamTabs)[number];

type TeamParticipation = TeamHackathon & { teamInfo: Team };

const defaultImages = [
  "/images/hackathons/hackathon-default-1.svg",
  "/images/hackathons/hackathon-default-2.svg",
  "/images/hackathons/hackathon-default-3.svg",
  "/images/hackathons/hackathon-default-4.svg",
];

const getStableDefaultImage = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % defaultImages.length;
  return defaultImages[index];
};

const formatDate = (value?: string | null) => {
  if (!value) return "TBD";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "TBD";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatDateTag = (value?: string | null) => {
  if (!value) return "--/--/----";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--/--/----";
  const dd = String(parsed.getDate()).padStart(2, '0');
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const yyyy = parsed.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const stageResultClass = (result: Stage["result"]) => {
  if (/qualified/i.test(result)) return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (/rejected/i.test(result)) return "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400";
  return "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300";
};

// Gradient seed colors for team avatars
const AVATAR_GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-400 to-teal-600",
  "from-violet-500 to-purple-600",
  "from-pink-500 to-rose-600",
  "from-amber-400 to-orange-500",
  "from-cyan-500 to-blue-600",
];

const getGradientClass = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
};

export default function TeamsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { setPageActions, closeSidebar, sidebarExpanded, toggleSidebar } = usePageChrome();
  const [sidebarWasExpanded, setSidebarWasExpanded] = useState(false);
  const sidebarWasExpandedRef = useRef(false);
  const toggleSidebarRef = useRef(toggleSidebar);
  const hasCollapsedSidebarRef = useRef(false);

  useEffect(() => {
    sidebarWasExpandedRef.current = sidebarWasExpanded;
  }, [sidebarWasExpanded]);

  useEffect(() => {
    toggleSidebarRef.current = toggleSidebar;
  }, [toggleSidebar]);
  const [searchParams] = useSearchParams();

  const { teamsData, setTeamsData } = useCache();

  // Core Data States
  const [teams, setTeams] = useState<Team[]>(teamsData?.teams || []);
  const [allParticipations, setAllParticipations] = useState<Record<string, TeamHackathon[]>>(teamsData?.allParticipations || {});
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("Hackathons");
  const [teamParticipations, setTeamParticipations] = useState<TeamParticipation[]>([]);
  const [loading, setLoading] = useState(!teamsData);
  const [loadingTeamData, setLoadingTeamData] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState<"" | "winrate" | "participations">("");

  // Modals visibility
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Create Team Modal Form State
  const [createTeamName, setCreateTeamName] = useState("");
  const [githubSearchText, setGithubSearchText] = useState("");
  const [githubSearchLoading, setGithubSearchLoading] = useState(false);
  const [githubSearchError, setGithubSearchError] = useState("");
  const [searchedGithubUser, setSearchedGithubUser] = useState<any | null>(null);
  const [addedTeammates, setAddedTeammates] = useState<Array<{ login: string; avatar_url: string; email?: string }>>([]);

  // Join Team Modal Form State
  const [joinTokenInput, setJoinTokenInput] = useState("");
  const [joinError, setJoinError] = useState("");

  // Detailed view states
  const [renameTeamName, setRenameTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<GeneratedInvitationLink | null>(null);
  const [savingTeam, setSavingTeam] = useState(false);
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [newStageDraft, setNewStageDraft] = useState<Record<string, { name: string; deadline: string }>>({});
  const [isAddingStageMap, setIsAddingStageMap] = useState<Record<string, boolean>>({});
  const [selectedParticipationId, setSelectedParticipationId] = useState<string>("");
  const [stageSaving, setStageSaving] = useState<Record<string, "saved" | "saving" | "error">>({});
  const [stripSort, setStripSort] = useState<'most_qualified' | 'latest' | 'oldest'>('latest');

  // Direct In-App Invite Form States
  const [directInviteSearchText, setDirectInviteSearchText] = useState("");
  const [directInviteLoading, setDirectInviteLoading] = useState(false);
  const [directInviteResults, setDirectInviteResults] = useState<UserLite[]>([]);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  
  // UI states for Members Tab
  const [rosterSearchQuery, setRosterSearchQuery] = useState("");
  const [inviteTab, setInviteTab] = useState<'direct' | 'code' | 'email'>('direct');
  const [copiedCode, setCopiedCode] = useState(false);

  // Deletion verification states
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");

  // Untrack verification states
  const [showUntrackConfirmModal, setShowUntrackConfirmModal] = useState(false);
  const [participationToUntrack, setParticipationToUntrack] = useState<{ id: string; title: string } | null>(null);
  const [isUntracking, setIsUntracking] = useState(false);

  // Stage delete confirmation states
  const [stageToDelete, setStageToDelete] = useState<{
    participationId: string;
    stageId: string;
    stageName: string;
  } | null>(null);
  const [isDeletingStage, setIsDeletingStage] = useState(false);

  // Settings sub-navigation
  const [settingsSection, setSettingsSection] = useState<'general' | 'members' | 'invitations' | 'danger'>('general');

  // Remove member modal
  const [removeMemberModal, setRemoveMemberModal] = useState<{ id: string; name: string } | null>(null);
  const [removeMemberLoading, setRemoveMemberLoading] = useState(false);

  // Invitations panel
  const [teamInvitations, setTeamInvitations] = useState<TeamInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);

  // Leave team modal
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveTeamLoading, setLeaveTeamLoading] = useState(false);

  const selectedTeam = useMemo(() => teams.find((team) => team._id === selectedTeamId) || null, [teams, selectedTeamId]);
  const selectedParticipation = useMemo(
    () => teamParticipations.find((participation) => participation._id === selectedParticipationId) || null,
    [teamParticipations, selectedParticipationId]
  );

  // Sort participations and assign sequence numbers based on createdAt (earliest = #1)
  const sortedParticipations = useMemo(() => {
    // First, sort by createdAt ascending to assign stable sequence numbers
    const withIndex = [...teamParticipations]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((p, i) => ({ ...p, seqNum: i + 1 }));

    // Then apply the user's chosen sort
    if (stripSort === 'most_qualified') {
      const qualScore = (p: TeamParticipation) => {
        const compStages = p.stages.filter(s => !isRegistrationStage(s.name));
        const qualified = compStages.filter(s => s.result === 'qualified').length;
        const total = compStages.length || 1;
        return qualified / total;
      };
      return [...withIndex].sort((a, b) => qualScore(b) - qualScore(a));
    }
    if (stripSort === 'oldest') {
      return withIndex; // already ascending
    }
    // 'latest' — reverse chronological
    return [...withIndex].reverse();
  }, [teamParticipations, stripSort]);

  const loadTeams = async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    }
    try {
      const data = await teamApi.getUserTeams();
      setTeams(data);

      // Load participations for all teams in parallel to show stats on cards
      const participationsMap: Record<string, TeamHackathon[]> = {};
      await Promise.all(
        data.map(async (t) => {
          try {
            const ths = await teamApi.getTeamHackathons(t._id);
            participationsMap[t._id] = ths;
          } catch (e) {
            console.error("Failed to load participations for team", t._id, e);
            participationsMap[t._id] = [];
          }
        })
      );
      setAllParticipations(participationsMap);
      
      setTeamsData({
        teams: data,
        allParticipations: participationsMap,
      });

      // Preserve selected team if it exists in the new teams list, otherwise default to empty grid
      setSelectedTeamId((current) => data.some(t => t._id === current) ? current : "");
    } catch (error) {
      console.error("Failed to load teams", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamWorkspace = async (teamId: string, isSilent = false) => {
    if (!teamId) return;
    
    const cachedParticipations = allParticipations[teamId];
    const team = teams.find((candidate) => candidate._id === teamId);
    
    if (cachedParticipations && team) {
      setTeamParticipations(cachedParticipations.map((participation) => ({ ...participation, teamInfo: team })));
    }

    if (!cachedParticipations && !isSilent) {
      setLoadingTeamData(true);
    }
    try {
      const participations = await teamApi.getTeamHackathons(teamId);
      if (team) {
        const mapped = participations.map((participation) => ({ ...participation, teamInfo: team }));
        setTeamParticipations(mapped);
        
        // Update local map as well
        setAllParticipations(prev => ({ ...prev, [teamId]: participations }));
        setTeamsData({
          teams,
          allParticipations: { ...allParticipations, [teamId]: participations },
        });
      } else {
        setTeamParticipations([]);
      }
    } catch (error) {
      console.error("Failed to load team workspace", error);
      if (!cachedParticipations) {
        setTeamParticipations([]);
      }
    } finally {
      setLoadingTeamData(false);
    }
  };

  useEffect(() => {
    loadTeams(!!teamsData);
  }, []);

  // Sync route query parameters on change or load
  useEffect(() => {
    const teamIdParam = searchParams.get("teamId");
    const tabParam = searchParams.get("tab");

    if (teamIdParam) {
      setSelectedTeamId(teamIdParam);
    }
    if (tabParam && teamTabs.includes(tabParam as any)) {
      setActiveTab(tabParam as WorkspaceTab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedTeamId) {
      loadTeamWorkspace(selectedTeamId, !!allParticipations[selectedTeamId]);
      
      const participationIdParam = searchParams.get("participationId");
      if (participationIdParam) {
        setSelectedParticipationId(participationIdParam);
      } else {
        setSelectedParticipationId("");
      }

      setInviteLink(null);
      setWorkspaceMessage(null);
      setWorkspaceError(null);
    } else {
      setTeamParticipations([]);
      setSelectedParticipationId("");
      // Restore sidebar if it was expanded before
      if (sidebarWasExpanded) {
        setSidebarWasExpanded(false);
        toggleSidebar();
      }
    }
  }, [selectedTeamId]);

  // Reset when loading starts or team selection changes
  useEffect(() => {
    if (!selectedTeamId || loading || loadingTeamData) {
      hasCollapsedSidebarRef.current = false;
    }
  }, [selectedTeamId, loading, loadingTeamData]);

  // Collapse sidebar to give full width to workspace after loading animation disappears
  useEffect(() => {
    if (selectedTeamId && !loading && !loadingTeamData && !hasCollapsedSidebarRef.current) {
      hasCollapsedSidebarRef.current = true;
      if (sidebarExpanded) {
        setSidebarWasExpanded(true);
        closeSidebar();
      }
    }
  }, [selectedTeamId, loading, loadingTeamData, sidebarExpanded, closeSidebar]);

  // Restore sidebar on unmount if it was expanded before this page collapsed it
  useEffect(() => {
    return () => {
      if (sidebarWasExpandedRef.current) {
        toggleSidebarRef.current();
      }
    };
  }, []);

  useEffect(() => {
    const participationIdParam = searchParams.get("participationId");
    if (participationIdParam && teamParticipations.some(p => p._id === participationIdParam)) {
      setSelectedParticipationId(participationIdParam);
    } else if (!selectedParticipationId && teamParticipations.length > 0) {
      setSelectedParticipationId(teamParticipations[0]._id);
    }
  }, [teamParticipations, selectedParticipationId, searchParams]);

  // Smooth scroll and highlight focus stage
  useEffect(() => {
    const stageIdParam = searchParams.get("stageId");
    if (activeTab === "Stages" && selectedParticipationId && stageIdParam) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`stage-${stageIdParam}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-4', 'ring-blue-500/40', 'dark:ring-blue-400/40');
          setTimeout(() => {
            el.classList.remove('ring-4', 'ring-blue-500/40', 'dark:ring-blue-400/40');
          }, 3000);
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [activeTab, selectedParticipationId, searchParams]);

  useEffect(() => {
    if (selectedTeamId && activeTab === "Members") {
      loadTeamInvitations();
    }
  }, [selectedTeamId, activeTab]);

  // GitHub User Lookup
  const handleGithubSearch = async () => {
    const query = githubSearchText.trim();
    if (!query) return;
    setGithubSearchLoading(true);
    setGithubSearchError("");
    setSearchedGithubUser(null);
    try {
      const res = await fetch(`https://api.github.com/users/${query}`);
      if (res.ok) {
        const data = await res.json();
        setSearchedGithubUser(data);
      } else {
        // Fallback user if rate limited or not found
        setSearchedGithubUser({
          login: query,
          name: query.replace(/-/g, " "),
          avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${query}`,
          bio: "GitHub Developer",
          public_repos: 5,
        });
      }
    } catch {
      // Offline fallback
      setSearchedGithubUser({
        login: query,
        name: query.replace(/-/g, " "),
        avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${query}`,
        bio: "Mock developer profile",
        public_repos: 3,
      });
    } finally {
      setGithubSearchLoading(false);
    }
  };

  const handleAddGithubMember = () => {
    if (!searchedGithubUser) return;
    if (addedTeammates.some(item => item.login.toLowerCase() === searchedGithubUser.login.toLowerCase())) {
      setGithubSearchError("Teammate already added to roster.");
      return;
    }
    setAddedTeammates(prev => [...prev, { login: searchedGithubUser.login, avatar_url: searchedGithubUser.avatar_url }]);
    setSearchedGithubUser(null);
    setGithubSearchText("");
  };

  // Create Team with Optional Invites
  const handleCreateTeam = async () => {
    if (!createTeamName.trim()) return;
    setSavingTeam(true);
    setWorkspaceMessage(null);
    try {
      const created = await teamApi.createTeam({ name: createTeamName.trim() });
      
      // Process email invites for added teammates
      await Promise.all(
        addedTeammates.map(async (member) => {
          if (member.email?.trim()) {
            try {
              await teamApi.generateInvitationLink(created._id, member.email.trim());
            } catch (err) {
              console.error(`Failed to send invite link to ${member.email}`, err);
            }
          }
        })
      );

      setTeams((current) => [created, ...current]);
      setSelectedTeamId(created._id);
      
      // Reset form states
      setCreateTeamName("");
      setAddedTeammates([]);
      setSearchedGithubUser(null);
      setWorkspaceMessage(`Successfully created team "${created.name}" and sent invites.`);
      setShowCreateModal(false);
    } catch (error: any) {
      console.error("Failed to create team", error);
      showToast(error.response?.data?.message || "Failed to create team.", "error");
    } finally {
      setSavingTeam(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (!selectedTeam) return;
    setRegeneratingCode(true);
    try {
      const updated = await teamApi.regenerateTeamCode(selectedTeam._id);
      showToast("Join code regenerated successfully!", "success");
      setTeams(teams.map(t => t._id === updated._id ? updated : t));
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to regenerate join code.", "error");
    } finally {
      setRegeneratingCode(false);
    }
  };

  const handleDirectInviteSearch = async (query: string) => {
    setDirectInviteSearchText(query);
    if (!query.trim()) {
      setDirectInviteResults([]);
      return;
    }
    setDirectInviteLoading(true);
    try {
      const results = await userApi.searchUsers(query.trim());
      const memberIds = selectedTeam ? selectedTeam.members.map(m => m._id) : [];
      if (selectedTeam) memberIds.push(selectedTeam.owner._id);
      const filtered = results.filter(u => !memberIds.includes(u._id));
      setDirectInviteResults(filtered);
    } catch (err) {
      console.error("Failed to search users", err);
    } finally {
      setDirectInviteLoading(false);
    }
  };

  const handleSendDirectInvite = async (targetUserId: string) => {
    if (!selectedTeam) return;
    setSavingTeam(true);
    try {
      await teamApi.inviteUserDirect(selectedTeam._id, targetUserId);
      showToast("In-app invitation sent successfully!", "success");
      setDirectInviteSearchText("");
      setDirectInviteResults([]);
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to send invitation.", "error");
    } finally {
      setSavingTeam(false);
    }
  };

  // Join Team via Token / URL / Join Code
  const handleJoinTeam = async () => {
    let inputToken = joinTokenInput.trim();
    if (!inputToken) return;
    setSavingTeam(true);
    setJoinError("");
    
    // Parse link if it's a URL
    if (inputToken.includes("token=")) {
      try {
        const url = new URL(inputToken);
        inputToken = url.searchParams.get("token") || inputToken;
      } catch {
        // ignore url parse error
      }
    }

    try {
      let joinedTeam;
      if (inputToken.length === 6 && /^[a-zA-Z0-9]+$/.test(inputToken)) {
        joinedTeam = await teamApi.joinTeamByCode(inputToken.toUpperCase());
      } else {
        joinedTeam = await teamApi.acceptInvitationLink(inputToken);
      }
      setWorkspaceMessage(`Successfully joined team: "${joinedTeam.name}"!`);
      
      await loadTeams();
      setSelectedTeamId(joinedTeam._id);
      
      setJoinTokenInput("");
      setShowJoinModal(false);
    } catch (err: any) {
      console.error(err);
      setJoinError(err.response?.data?.message || "Failed to join team. Make sure the token or code is valid.");
    } finally {
      setSavingTeam(false);
    }
  };

  // Desktop header strip action panel
  const pageActions = useMemo(() => {
    if (selectedTeamId && selectedTeam) {
      return (
        <div className="flex w-full items-center gap-4 overflow-visible">
          {/* Left: Back button, Team Identity, then Tabs */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSelectedTeamId("")}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 shadow-xs transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
              title="Back to Teams"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`h-8.5 w-8.5 shrink-0 rounded-xl bg-gradient-to-tr ${getGradientClass(selectedTeam.name)} flex items-center justify-center font-logo font-black text-white text-xs shadow-xs`}>
                {selectedTeam.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white truncate leading-none">{selectedTeam.name}</h2>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 truncate leading-none">
                  Leader: {selectedTeam.owner.fullName || `@${selectedTeam.owner.username}`}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 shrink-0" />

            {/* Tabs — left side, right after identity */}
            <div className="flex gap-0.5 bg-zinc-100 dark:bg-zinc-800/60 p-0.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
              {teamTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === tab
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Center: Sort controls — flex-1 + justify-center keeps it truly centered */}
          <div className="flex-1 flex items-center justify-center">
            {activeTab === "Hackathons" && teamParticipations.length > 0 && (
              <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800/60 p-0.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                {(['latest', 'oldest', 'most_qualified'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setStripSort(opt)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      stripSort === opt
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300'
                    }`}
                  >
                    {opt === 'most_qualified' ? 'Qualified' : opt === 'latest' ? 'Latest' : 'Oldest'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex w-auto max-w-full min-w-0 items-center justify-end gap-2 overflow-visible">
        {/* Search */}
        <div className="relative w-64 shrink">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-8 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500/45 focus:outline-none focus:ring-3 focus:ring-blue-500/12 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-400/50"
            placeholder="Search teams..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Platform Filter */}
        <AppDropdown
          value={platformFilter}
          onChange={setPlatformFilter}
          options={TEAM_PLATFORM_OPTIONS}
          placeholder="All Platforms"
        />

        {/* Track Status Filter */}
        <AppDropdown
          value={statusFilter}
          onChange={setStatusFilter}
          options={TEAM_STATUS_OPTIONS}
          placeholder="All Teams"
        />

        {/* Sort Filter */}
        <AppDropdown
          value={sortBy}
          onChange={v => setSortBy(v as any)}
          options={TEAM_SORT_OPTIONS}
          placeholder="Default Order"
        />

        {/* Join Team Button */}
        <button
          onClick={() => setShowJoinModal(true)}
          className="btn btn-secondary"
        >
          Join Team
        </button>

        {/* Create Team Button */}
        <button
          onClick={() => {
            setAddedTeammates([]);
            setSearchedGithubUser(null);
            setGithubSearchText("");
            setCreateTeamName("");
            setShowCreateModal(true);
          }}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4" />
          Create Team
        </button>
      </div>
    );
  }, [searchQuery, platformFilter, statusFilter, sortBy, selectedTeamId, selectedTeam, activeTab, stripSort, teamParticipations.length]);

  useEffect(() => {
    setPageActions(pageActions);
    return () => setPageActions(null);
  }, [pageActions, setPageActions]);

  // Rename team
  const handleRenameTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTeam || !renameTeamName.trim()) return;
    setSavingTeam(true);
    try {
      const updated = await teamApi.updateTeam(selectedTeam._id, { name: renameTeamName.trim() });
      setTeams((current) => current.map((team) => (team._id === updated._id ? updated : team)));
      setRenameTeamName("");
      showToast("Team renamed successfully.", "success");
    } catch (error: any) {
      console.error("Failed to rename team", error);
      showToast(error.response?.data?.message || "Failed to rename team.", "error");
    } finally {
      setSavingTeam(false);
    }
  };

  // Generate Invite Teammate
  const handleInvite = async () => {
    if (!selectedTeam || !inviteEmail.trim()) return;
    setSavingTeam(true);
    setWorkspaceMessage(null);
    setWorkspaceError(null);
    try {
      const link = await teamApi.generateInvitationLink(selectedTeam._id, inviteEmail.trim());
      setInviteLink(link);
      setInviteEmail("");
      setWorkspaceMessage("Invitation link generated successfully.");
    } catch (error: any) {
      console.error("Failed to generate invite link", error);
      setWorkspaceError(error.response?.data?.message || "Failed to generate invitation link.");
    } finally {
      setSavingTeam(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteLink?.invitationLink) return;
    await navigator.clipboard.writeText(inviteLink.invitationLink);
    setWorkspaceMessage("Invitation link copied to clipboard.");
  };

  // Delete Team
  const handleDeleteTeam = async () => {
    if (!selectedTeam) return;
    if (deleteConfirmInput !== selectedTeam.name) {
      showToast("Verification name does not match.", "error");
      return;
    }
    setSavingTeam(true);
    try {
      await teamApi.deleteTeam(selectedTeam._id);
      showToast(`Team "${selectedTeam.name}" has been permanently deleted.`, "success");
      setShowDeleteConfirmModal(false);
      setDeleteConfirmInput("");
      setSelectedTeamId("");
      await loadTeams();
    } catch (error: any) {
      console.error("Failed to delete team", error);
      showToast(error.response?.data?.message || "Failed to delete team.", "error");
    } finally {
      setSavingTeam(false);
    }
  };

  // Remove a member from the team
  const handleRemoveMember = async () => {
    if (!selectedTeam || !removeMemberModal) return;
    setRemoveMemberLoading(true);
    try {
      const updated = await teamApi.removeMember(selectedTeam._id, removeMemberModal.id);
      setTeams((current) => current.map((t) => t._id === updated._id ? updated : t));
      showToast(`${removeMemberModal.name} has been removed from the team.`, "success");
      setRemoveMemberModal(null);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to remove member.", "error");
    } finally {
      setRemoveMemberLoading(false);
    }
  };

  // Load pending team invitations
  const loadTeamInvitations = async () => {
    if (!selectedTeam) return;
    setInvitationsLoading(true);
    try {
      const invites = await teamApi.getTeamInvitations(selectedTeam._id);
      setTeamInvitations(invites);
    } catch {
      // silently fail
    } finally {
      setInvitationsLoading(false);
    }
  };

  // Leave team (current user removes themselves)
  const handleLeaveTeam = async () => {
    if (!selectedTeam || !user) return;
    setLeaveTeamLoading(true);
    try {
      await teamApi.removeMember(selectedTeam._id, user._id);
      showToast(`You've left "${selectedTeam.name}".`, "success");
      setShowLeaveModal(false);
      setSelectedTeamId("");
      await loadTeams();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to leave team.", "error");
    } finally {
      setLeaveTeamLoading(false);
    }
  };

  const handleUpdateParticipationStatus = async (participationId: string, nextStatus: string) => {
    const participation = teamParticipations.find((p) => p._id === participationId);
    if (!participation) return;
    try {
      const updated = await teamApi.updateStatus(participation.teamInfo._id, participationId, nextStatus as any);
      setTeamParticipations((current) =>
        current.map((item) =>
          item._id === participationId
            ? { ...item, status: updated.status }
            : item
        )
      );
      showToast(`Workspace status updated to "${nextStatus}" successfully!`, "success");
    } catch (error: any) {
      console.error("Failed to update participation status", error);
      showToast(error.response?.data?.message || "Failed to update workspace status", "error");
    }
  };

  const handleInitiateUntrack = (participationId: string, hackathonTitle: string) => {
    setParticipationToUntrack({ id: participationId, title: hackathonTitle });
    setShowUntrackConfirmModal(true);
  };

  const handleConfirmUntrack = async () => {
    if (!participationToUntrack || !selectedTeam) return;
    const part = teamParticipations.find(p => p._id === participationToUntrack.id);
    if (!part) return;

    setIsUntracking(true);
    try {
      await teamApi.unlinkHackathon(selectedTeam._id, part.hackathon._id);
      
      // Update local states
      setTeamParticipations(current => current.filter(p => p._id !== part._id));
      setAllParticipations(current => ({
        ...current,
        [selectedTeam._id]: (current[selectedTeam._id] || []).filter(p => p._id !== part._id)
      }));

      showToast(`Successfully untracked "${participationToUntrack.title}"`, "success");
      setShowUntrackConfirmModal(false);
      setParticipationToUntrack(null);
    } catch (error: any) {
      console.error("Failed to untrack hackathon", error);
      showToast(error.response?.data?.message || "Failed to untrack hackathon", "error");
    } finally {
      setIsUntracking(false);
    }
  };

  // Stages operations
  const handleAddStage = async (participationId: string) => {
    const draft = newStageDraft[participationId];
    if (!draft?.name?.trim() || isAddingStageMap[participationId]) return;

    const participation = teamParticipations.find((item) => item._id === participationId);
    if (!participation) return;

    if (isRegistrationStage(draft.name)) {
      showToast("Registration is tracked automatically. Please add a competitive milestone.", "error");
      return;
    }

    const targetCanonical = getCanonicalStageName(draft.name);
    const duplicate = participation.stages.some(
      (s) => getCanonicalStageName(s.name) === targetCanonical
    );
    if (duplicate) {
      showToast("A stage with this name already exists.", "error");
      return;
    }

    setIsAddingStageMap((prev) => ({ ...prev, [participationId]: true }));
    try {
      const createdStage = await teamApi.addStage(participation.teamInfo._id, participationId, {
        name: draft.name.trim(),
        deadline: draft.deadline || undefined,
      });
      setTeamParticipations((current) =>
        current.map((item) => (item._id === participationId ? { ...item, stages: [...item.stages, createdStage] } : item))
      );
      setNewStageDraft((current) => ({ ...current, [participationId]: { name: "", deadline: "" } }));
      
      // Update local participations map
      setAllParticipations(prev => ({
        ...prev,
        [participation.teamInfo._id]: prev[participation.teamInfo._id].map(p => 
          p._id === participationId ? { ...p, stages: [...p.stages, createdStage] } : p
        )
      }));
    } catch (error: any) {
      console.error("Failed to add stage", error);
      showToast(error.response?.data?.message || "Failed to add stage", "error");
    } finally {
      setIsAddingStageMap((prev) => ({ ...prev, [participationId]: false }));
    }
  };

  const handleUpdateStage = async (participationId: string, stageId: string, payload: { name?: string; deadline?: string | null; result?: Stage["result"] }) => {
    const participation = teamParticipations.find((item) => item._id === participationId);
    if (!participation) return;

    if (payload.name !== undefined) {
      if (isRegistrationStage(payload.name)) {
        showToast("Registration is tracked automatically. Please use a competitive milestone name.", "error");
        setStageSaving((current) => ({ ...current, [stageId]: "error" }));
        return;
      }
      const stage = participation.stages.find((s) => s._id === stageId);
      if (stage && payload.name.trim() !== stage.name) {
        const canonicalName = getCanonicalStageName(payload.name);
        const duplicate = participation.stages.some(
          (s) => s._id !== stageId && getCanonicalStageName(s.name) === canonicalName
        );
        if (duplicate) {
          showToast("A stage with this name already exists.", "error");
          setStageSaving((current) => ({ ...current, [stageId]: "error" }));
          return;
        }
      }
    }

    setStageSaving((current) => ({ ...current, [stageId]: "saving" }));
    try {
      const updatedStage = await teamApi.updateStage(participation.teamInfo._id, participationId, stageId, payload);
      const updater = (current: TeamHackathon[]) =>
        current.map((item) => ({
          ...item,
          stages: item._id === participationId ? item.stages.map((stage) => (stage._id === stageId ? { ...stage, ...updatedStage } : stage)) : item.stages,
        }));
        
      setTeamParticipations((current) => updater(current) as TeamParticipation[]);
      setAllParticipations(prev => ({
        ...prev,
        [participation.teamInfo._id]: updater(prev[participation.teamInfo._id])
      }));

      setStageSaving((current) => ({ ...current, [stageId]: "saved" }));

      // If a result was changed, silently re-fetch to sync backend-driven resets
      if (payload.result !== undefined) {
        await loadTeamWorkspace(participation.teamInfo._id, true);
      }
    } catch (error: any) {
      console.error("Failed to update stage", error);
      showToast(error.response?.data?.message || "Failed to update stage", "error");
      setStageSaving((current) => ({ ...current, [stageId]: "error" }));
    }
  };

  const handleDeleteStage = (participationId: string, stageId: string, stageName: string) => {
    setStageToDelete({ participationId, stageId, stageName });
  };

  const handleConfirmDeleteStage = async () => {
    if (!stageToDelete) return;
    const { participationId, stageId } = stageToDelete;
    const participation = teamParticipations.find((item) => item._id === participationId);
    if (!participation) {
      setStageToDelete(null);
      return;
    }

    setIsDeletingStage(true);
    try {
      console.log("[DEBUG] handleDeleteStage inputs in Teams:", {
        teamId: participation.teamInfo._id,
        participationId,
        stageId
      });
      await teamApi.deleteStage(participation.teamInfo._id, participationId, stageId);
      const updater = (current: TeamHackathon[]) =>
        current.map((item) => (item._id === participationId ? { ...item, stages: item.stages.filter((stage) => stage._id !== stageId) } : item));
      
      setTeamParticipations((current) => updater(current) as TeamParticipation[]);
      setAllParticipations(prev => ({
        ...prev,
        [participation.teamInfo._id]: updater(prev[participation.teamInfo._id])
      }));
      showToast("Stage deleted successfully", "success");
    } catch (error: any) {
      console.error("Failed to delete stage", error);
      showToast(error.response?.data?.message || "Failed to delete stage", "error");
    } finally {
      setIsDeletingStage(false);
      setStageToDelete(null);
    }
  };

  // Filtered and Sorted Teams
  const filteredTeams = useMemo(() => {
    let result = [...teams];

    // 1. Platform Filter
    if (platformFilter) {
      result = result.filter(t => {
        const teamParts = allParticipations[t._id] || [];
        return teamParts.some(p => p.hackathon.platform?.toLowerCase() === platformFilter.toLowerCase());
      });
    }

    // 2. Status Filter
    if (statusFilter === "active") {
      result = result.filter(t => {
        const teamParts = allParticipations[t._id] || [];
        return teamParts.length > 0;
      });
    } else if (statusFilter === "winners") {
      result = result.filter(t => {
        const teamParts = allParticipations[t._id] || [];
        return teamParts.some(p => p.status === "won");
      });
    }

    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(t => {
        const teamNameMatch = t.name.toLowerCase().includes(q);
        const ownerMatch = (t.owner.fullName || "").toLowerCase().includes(q) || (t.owner.username || "").toLowerCase().includes(q);
        const membersMatch = t.members.some(m => 
          (m.fullName || "").toLowerCase().includes(q) || (m.username || "").toLowerCase().includes(q)
        );
        return teamNameMatch || ownerMatch || membersMatch;
      });
    }

    // 4. Sorting
    if (sortBy === "winrate") {
      result.sort((a, b) => {
        const aParts = allParticipations[a._id] || [];
        const bParts = allParticipations[b._id] || [];
        const aWins = aParts.filter(p => p.status === "won").length;
        const bWins = bParts.filter(p => p.status === "won").length;
        const aCompleted = aParts.filter(p => p.status === "won" || p.status === "eliminated").length;
        const bCompleted = bParts.filter(p => p.status === "won" || p.status === "eliminated").length;
        const aRate = aCompleted > 0 ? aWins / aCompleted : 0;
        const bRate = bCompleted > 0 ? bWins / bCompleted : 0;
        if (bRate !== aRate) return bRate - aRate;
        return bParts.length - aParts.length;
      });
    } else if (sortBy === "participations") {
      result.sort((a, b) => {
        const aParts = (allParticipations[a._id] || []).length;
        const bParts = (allParticipations[b._id] || []).length;
        return bParts - aParts;
      });
    }

    return result;
  }, [teams, platformFilter, statusFilter, searchQuery, sortBy, allParticipations]);



  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-4 py-10">
        <div className="flex flex-col items-center max-w-sm text-center">
          <div className="flex items-center justify-center overflow-visible py-2">
            <LogoTransition width={320} height={220} loop={true} />
          </div>
          <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 mt-2 tracking-tight">
            Assembling Workspace
          </h3>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-normal">
            Synchronizing teams, roster data, and stage history...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`mx-auto w-full px-4 py-6 md:px-6 space-y-6 ${selectedTeamId ? '' : 'max-w-7xl'}`}>

      {/* Mobile Filter / Action Panel (Consistent layout with Hackathons page, only when not viewing team workspace) */}
      {!selectedTeamId && (
        <div className="relative z-50 isolate space-y-3 lg:hidden">
          <div className="relative z-50 isolate overflow-visible rounded-3xl border border-zinc-200/90 bg-white/90 p-4 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/78 dark:shadow-md flex items-end gap-3">
            {/* Search */}
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
              <input
                type="text"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-8 py-2 text-sm text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 focus:border-blue-500/45 focus:outline-none focus:ring-3 focus:ring-blue-500/12 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-400/50"
                placeholder="Search teams or members..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="relative z-50 isolate overflow-visible rounded-3xl border border-zinc-200/90 bg-white/90 p-4 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/78 dark:shadow-md flex flex-wrap gap-2.5">
            {/* Platform Filter */}
            <AppDropdown
              value={platformFilter}
              onChange={setPlatformFilter}
              options={TEAM_PLATFORM_OPTIONS}
              placeholder="All Platforms"
              className="flex-1 min-w-[120px]"
            />

            {/* Status Filter */}
            <AppDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={TEAM_STATUS_OPTIONS}
              placeholder="All Teams"
              className="flex-1 min-w-[120px]"
            />

            {/* Sort Filter */}
            <AppDropdown
              value={sortBy}
              onChange={v => setSortBy(v as any)}
              options={TEAM_SORT_OPTIONS}
              placeholder="Default Order"
              className="flex-1 min-w-[120px]"
            />
          </div>

          <div className="flex gap-2 w-full">
            <button
              onClick={() => setShowJoinModal(true)}
              className="btn btn-secondary flex-1"
            >
              Join Team
            </button>
            <button
              onClick={() => {
                setAddedTeammates([]);
                setSearchedGithubUser(null);
                setGithubSearchText("");
                setCreateTeamName("");
                setShowCreateModal(true);
              }}
              className="btn btn-primary flex-1"
            >
              <Plus className="h-4 w-4" />
              Create Team
            </button>
          </div>
        </div>
      )}

      {workspaceMessage && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3.5 text-sm text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-semibold">{workspaceMessage}</span>
          </div>
          <button onClick={() => setWorkspaceMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {workspaceError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3.5 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            <span className="font-semibold">{workspaceError}</span>
          </div>
          <button onClick={() => setWorkspaceError(null)} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main content flow */}
      {!selectedTeamId ? (
        /* Team Grid view */
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTeams.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-zinc-200 bg-white p-16 text-center dark:border-zinc-800 dark:bg-zinc-950/40">
              <Users className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-500" />
              <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">No teams match</h3>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Try adjusting your filters or search criteria.</p>
            </div>
          ) : (
            filteredTeams.map((t) => {
              const isOwner = t.owner._id === user?._id;
              const teamParts = allParticipations[t._id] || [];
              const wins = teamParts.filter(p => p.status === "won").length;



              // Find next upcoming milestone/deadline
              let nextDeadline: { date: Date; name: string; hackathonTitle: string } | null = null;
              for (const p of teamParts) {
                for (const s of p.stages) {
                  if (s.result === 'pending' && s.deadline) {
                    const d = new Date(s.deadline);
                    if (!Number.isNaN(d.getTime())) {
                      const currentNext = nextDeadline as { date: Date; name: string; hackathonTitle: string } | null;
                      if (!currentNext || d.getTime() < currentNext.date.getTime()) {
                        nextDeadline = { date: d, name: s.name, hackathonTitle: p.hackathon.title };
                      }
                    }
                  }
                }
              }

              // Win rate calculations
              const totalCompleted = teamParts.filter(p => p.status === 'won' || p.status === 'eliminated').length;
              const winRate = totalCompleted > 0 ? Math.round((wins / totalCompleted) * 100) : 0;
              const rating = (4.1 + Math.min(t.members.length * 0.1, 0.4) + Math.min(wins * 0.2, 0.4)).toFixed(1);
              const shouldOverlap = t.members.length > 3;

              return (
                <div
                  key={t._id}
                  onClick={() => setSelectedTeamId(t._id)}
                  className="group rounded-2xl border border-zinc-200 bg-white p-5 text-left cursor-pointer transition-all duration-300 hover:border-zinc-300 hover:shadow-lg hover:-translate-y-0.5 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div className={`h-10 w-10 shrink-0 rounded-xl bg-gradient-to-tr ${getGradientClass(t.name)} flex items-center justify-center font-logo font-black text-white text-sm shadow-xs`}>
                          {t.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                            {t.name}
                          </h3>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                            Leader: {t.owner.fullName || `@${t.owner.username}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold tracking-wider uppercase border ${
                          isOwner
                            ? "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "border-zinc-200 bg-zinc-100/50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                        }`}>
                          {isOwner ? "Leader" : "Teammate"}
                        </span>
                        <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-400/10 dark:text-amber-400 border border-amber-500/20 dark:border-amber-400/20">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400" />
                          <span>{rating}</span>
                        </div>
                      </div>
                    </div>

                    {/* Overlapping member avatars */}
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center overflow-visible ${shouldOverlap ? "-space-x-2.5" : "gap-1.5"}`}>
                        {t.members.map((member, mIdx) => (
                          <img
                            key={member._id || mIdx}
                            src={`https://github.com/${member.username || 'octocat'}.png`}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${member.username || member._id}`;
                            }}
                            className="inline-block h-7 w-7 rounded-full border-2 border-white dark:border-zinc-900 object-cover shadow-sm transition-transform duration-250 hover:scale-110 hover:z-20 cursor-pointer"
                            title={member.fullName || member.username}
                            alt="member avatar"
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
                        {t.members.length} {t.members.length === 1 ? "member" : "members"}
                      </span>
                    </div>
                  </div>

                  {/* Performance Summaries & View Button */}
                  <div className="mt-4 pt-3.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-500">
                        <span className="font-semibold text-zinc-600 dark:text-zinc-400">{teamParts.length} trackings</span>
                        <span>•</span>
                        {totalCompleted > 0 ? (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{winRate}% Win Rate</span>
                        ) : (
                          <span className="text-zinc-400 italic">No record</span>
                        )}
                      </div>
                      <div className="h-1 w-28 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex mt-1.5">
                        {totalCompleted > 0 ? (
                          <>
                            <div style={{ width: `${winRate}%` }} className="bg-emerald-500 h-full" />
                            <div style={{ width: `${100 - winRate}%` }} className="bg-rose-500 h-full" />
                          </>
                        ) : (
                          <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-full" />
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTeamId(t._id);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-3.5 py-1.5 text-xs font-bold transition-all duration-200 hover:bg-zinc-800 dark:hover:bg-white hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-xs"
                    >
                      <span>View</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Team Workspace Details view */
        <div className="space-y-4">
          
          {/* Mobile-only header panel */}
          {selectedTeam && (
            <div className="lg:hidden flex flex-col gap-3 bg-white dark:bg-zinc-900/40 border border-zinc-200/90 dark:border-zinc-800 p-4 rounded-2xl shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedTeamId("")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 shadow-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </button>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`h-8.5 w-8.5 shrink-0 rounded-xl bg-gradient-to-tr ${getGradientClass(selectedTeam.name)} flex items-center justify-center font-logo font-black text-white text-xs shadow-xs`}>
                    {selectedTeam.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-white truncate leading-none">{selectedTeam.name}</h2>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 truncate leading-none">
                      Leader: {selectedTeam.owner.fullName || `@${selectedTeam.owner.username}`}
                    </p>
                  </div>
                </div>
              </div>
              
            </div>
          )}

          {selectedTeam && (
            <div className="w-full space-y-4">
              {/* Tab content panels */}

              {/* 1. HACKATHONS TAB: Progress Strips Timeline */}
              {activeTab === "Hackathons" && (
                <div className="space-y-4">
                  {loadingTeamData ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200/60 bg-white px-4 py-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400 shadow-xs">
                      <LogoTransition width={200} height={130} loop={true} />
                      <p className="font-semibold">Loading participations timeline...</p>
                    </div>
                  ) : teamParticipations.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-white/50 p-10 text-center dark:border-zinc-800 dark:bg-zinc-900/10">
                      <Flag className="mx-auto h-10 w-10 text-zinc-400" />
                      <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">No active participations</h3>
                      <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        Go to the Hackathons list page and register this team to track progress milestones.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sortedParticipations.map((participation) => {
                        const competitiveStages = participation.stages.filter(s => !isRegistrationStage(s.name));
                        const failedStageIdx = competitiveStages.findIndex(s => s.result === 'rejected');
                        const segmentDuration = 0.5;
                        return (
                          <div
                            key={participation._id}
                            className="relative flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8 py-5 px-5 lg:py-6 lg:px-6 rounded-2xl border border-zinc-200 bg-white hover:shadow-md hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700 transition-all duration-300 overflow-visible w-full"
                          >
                            {/* Sequence pill badge — muted zinc, inside top-left of card */}
                            <span className="absolute top-3 left-3.5 inline-flex items-center px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 text-[9px] font-semibold tabular-nums select-none leading-none tracking-wide">
                              {participation.seqNum}
                            </span>

                            {/* Left Panel: Hackathon logo, details & Action Buttons */}
                            <div className="flex flex-col gap-3.5 w-full lg:w-[280px] shrink-0 min-w-0 lg:mt-2">
                              {/* Hackathon logo and details */}
                              <div className="flex items-start gap-3.5 min-w-0">
                                <img
                                  src={participation.hackathon.coverImage?.trim() || getStableDefaultImage(`${participation.hackathon._id}:${participation.hackathon.title}`)}
                                  onError={(e) => {
                                    e.currentTarget.src = "/BrandImages/HackDekh.png";
                                  }}
                                  className="h-12 w-12 rounded-xl object-cover border border-zinc-200 dark:border-zinc-800 shadow-xs shrink-0 animate-fade-in mt-0.5"
                                  alt="Hackathon cover"
                                />

                                <div className="min-w-0 flex-1 flex flex-col justify-start gap-1">
                                  <div className="flex items-start gap-1 justify-between">
                                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white leading-snug line-clamp-2 break-words flex-1 pr-1" title={participation.hackathon.title}>
                                      {participation.hackathon.title}
                                    </h4>
                                    {participation.hackathon.applyLink ? (
                                      <a
                                        href={participation.hackathon.applyLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-zinc-405 hover:text-zinc-700 dark:hover:text-zinc-200 p-0.5 shrink-0 transition-colors duration-200 ease-in-out mt-0.5"
                                        title="Open Official Site"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </a>
                                    ) : (
                                      <Link
                                        to={`/hackathons/${participation.hackathon._id}`}
                                        className="text-zinc-405 hover:text-zinc-700 dark:hover:text-zinc-200 p-0.5 shrink-0 transition-colors duration-200 ease-in-out mt-0.5"
                                        title="View Hackathon Details"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </Link>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                      participation.status === 'won' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/15' :
                                      participation.status === 'eliminated' ? 'text-rose-600 dark:text-rose-400 bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/15' :
                                      'text-blue-600 dark:text-blue-400 bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/15'
                                    }`}>{participation.status}</span>
                                    <span className="w-px h-3.5 bg-zinc-200 dark:bg-zinc-800" />
                                    <span className="inline-flex items-center gap-1.5 text-[10px] text-zinc-450 dark:text-zinc-500 tabular-nums font-medium">
                                      <Calendar className="h-3 w-3 text-zinc-450 dark:text-zinc-500" />
                                      {formatDateTag(participation.createdAt)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Inline Actions */}
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {/* Button 1: Registered Badge/Action */}
                                {participation.status === 'tracking' ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateParticipationStatus(participation._id, 'active');
                                    }}
                                    className="inline-flex items-center justify-center gap-1 h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-[10px] font-bold transition duration-150 cursor-pointer shadow-xs active:scale-95 leading-none shrink-0"
                                  >
                                    Register
                                  </button>
                                ) : (
                                  <div className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 dark:border-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold select-none leading-none shrink-0">
                                    <CheckCircle2 className="h-3 w-3" /> Registered
                                  </div>
                                )}

                                {/* Button 2: Untrack Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleInitiateUntrack(participation._id, participation.hackathon.title);
                                  }}
                                  className="inline-flex items-center justify-center gap-1 h-7 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-[10px] font-bold transition duration-150 cursor-pointer leading-none active:scale-95 shrink-0"
                                >
                                  <Trash2 className="h-3 w-3 text-zinc-400 dark:text-zinc-500" /> Untrack
                                </button>
                              </div>
                            </div>

                            {/* Right Panel: Tracker & Timeline */}
                            <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-visible w-full">
                              {/* Registration Tracker Block */}
                              {participation.status === 'tracking' && (
                                <div className="w-full rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs backdrop-blur-sm transition-all duration-350 border-amber-500/15 bg-amber-500/5 dark:bg-amber-500/3 text-amber-800 dark:text-amber-300 shadow-sm shadow-amber-500/5">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs bg-gradient-to-tr from-amber-500 to-orange-500 text-white">
                                      <AlertTriangle className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 text-left">
                                      <p className="font-extrabold uppercase tracking-wide text-[10px]">
                                        Prerequisite: Register for Hackathon
                                      </p>
                                      <p className="mt-0.5 text-zinc-655 dark:text-zinc-400 font-semibold truncate text-[11px]">
                                        {participation.hackathon.deadline ? (
                                          <span>
                                            Deadline: {new Date(participation.hackathon.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            {(() => {
                                              const days = Math.ceil((new Date(participation.hackathon.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                              if (days > 0) return ` (Ends in ${days} days)`;
                                              if (days === 0) return ` (Ends today!)`;
                                              return ` (Closed)`;
                                            })()}
                                          </span>
                                        ) : (
                                          'No official deadline specified. Register soon!'
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                    {participation.hackathon.applyLink && (
                                      <a
                                        href={participation.hackathon.applyLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 h-7.5 px-3.5 rounded-lg border border-amber-500/20 hover:border-amber-500/35 bg-white dark:bg-zinc-950 text-amber-700 dark:text-amber-400 font-bold transition-all duration-200 hover:bg-amber-500/5 text-[10.5px] cursor-pointer"
                                      >
                                        Register Site <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                    <button
                                      onClick={() => handleUpdateParticipationStatus(participation._id, 'active')}
                                      className="inline-flex items-center justify-center gap-1.5 h-7.5 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition duration-150 text-[10.5px] shadow-xs active:scale-95 cursor-pointer leading-none"
                                    >
                                      Mark Registered
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Stages Timeline */}
                              <div className={`pt-1 pb-24 overflow-visible transition-all duration-300 ${
                                participation.status === 'tracking' ? 'opacity-40 select-none' : ''
                              }`}>
                                {competitiveStages.length === 0 ? (
                                  <div className="flex items-start gap-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/40 bg-zinc-50/40 dark:bg-zinc-900/5 px-4 py-3.5 text-zinc-500 dark:text-zinc-400 text-xs text-left max-w-md shadow-xs backdrop-blur-sm">
                                    <Info className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                                    <p className="leading-relaxed">
                                      No competitive stages defined yet. Go to the <span className="font-semibold text-blue-650 dark:text-blue-400 cursor-pointer hover:underline" onClick={() => setActiveTab("Stages")}>Stages tab</span> to add custom tracker milestones.
                                    </p>
                                  </div>
                                ) : (
                                  <div 
                                    className="flex items-start gap-0 relative overflow-visible w-full pt-1"
                                    style={{ maxWidth: competitiveStages.length > 0 ? `${competitiveStages.length * 130}px` : '100%' }}
                                  >
                                    {competitiveStages.map((stage, sIdx) => {
                                      const hasPrev = sIdx > 0;
                                      const isFailedStage = sIdx === failedStageIdx;
                                      const isPostDisqualification = failedStageIdx !== -1 && sIdx > failedStageIdx;
                                      
                                      // Color of connector line BEFORE this stage
                                      let lineBg = 'bg-zinc-200 dark:bg-zinc-800';
                                      if (hasPrev) {
                                        const prevStageIdx = sIdx - 1;
                                        if (failedStageIdx !== -1 && prevStageIdx >= failedStageIdx) {
                                          // Line starts after failure
                                          lineBg = 'bg-rose-500/30 dark:bg-rose-500/20';
                                        } else {
                                          const prevStageObj = competitiveStages[prevStageIdx];
                                          if (prevStageObj.result === 'qualified') {
                                            lineBg = 'bg-emerald-500 dark:bg-emerald-400';
                                          } else if (prevStageObj.result === 'rejected') {
                                            lineBg = 'bg-rose-500 dark:bg-rose-400';
                                          }
                                        }
                                      }

                                      // Determine dot styling (halo + dot) - Solid Backgrounds to mask connector line
                                      let ringClass = 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900';
                                      let hoverStatusText = stage.result;

                                      const isFirstPending = failedStageIdx === -1 && competitiveStages.findIndex(st => st.result === 'pending') === sIdx;

                                      if (isPostDisqualification) {
                                        // Faded red / Disqualified
                                        ringClass = 'border-rose-500/25 bg-white dark:border-rose-500/20 dark:bg-zinc-900 text-rose-500/30 dark:text-rose-400/30';
                                        hoverStatusText = 'disqualified';
                                      } else if (isFailedStage) {
                                        // Active failed stage
                                        ringClass = 'border-rose-500/50 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-950 shadow-[0_0_12px_rgba(239,68,68,0.15)] text-rose-600 dark:text-rose-400';
                                      } else if (stage.result === 'qualified') {
                                        // Active success stage
                                        ringClass = 'border-emerald-500/50 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-950 shadow-[0_0_12px_rgba(16,185,129,0.15)] text-emerald-600 dark:text-emerald-400';
                                      } else if (isFirstPending) {
                                        // Active pending
                                        ringClass = 'border-blue-500/50 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-950 ring-4 ring-blue-500/5 text-blue-600 dark:text-blue-400';
                                      } else {
                                        // Future pending
                                        ringClass = 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500';
                                      }

                                      // Determine text color for status text
                                      const statusColorLabel =
                                        hoverStatusText === 'qualified'
                                          ? 'text-emerald-600 dark:text-emerald-455'
                                          : hoverStatusText === 'rejected' || hoverStatusText === 'disqualified'
                                            ? 'text-rose-555 dark:text-rose-455'
                                            : 'text-blue-500 dark:text-blue-400';

                                      return (
                                        <motion.div
                                          key={stage._id}
                                          initial={{ scale: 0, opacity: 0 }}
                                          animate={{ scale: 1, opacity: 1 }}
                                          transition={{ delay: sIdx * segmentDuration, duration: 0.25, ease: "backOut" }}
                                          className="relative flex flex-col items-center group overflow-visible cursor-pointer flex-1 min-w-0 hover:z-50 pt-3"
                                          onClick={() => {
                                            setSelectedParticipationId(participation._id);
                                            setActiveTab("Stages");
                                          }}
                                        >
                                          {/* Connector line inside the node, positioned absolutely behind the dot */}
                                          {hasPrev && (
                                            <div className="absolute right-[50%] w-full h-[2px] bg-zinc-200 dark:bg-zinc-800 top-[21px] z-0 origin-right">
                                              <motion.div
                                                initial={{ scaleX: 0 }}
                                                animate={{ scaleX: 1 }}
                                                transition={{ delay: (sIdx - 1) * segmentDuration + 0.15, duration: 0.35, ease: "easeInOut" }}
                                                className={`absolute inset-0 origin-left ${lineBg}`}
                                              />
                                            </div>
                                          )}

                                          {/* Premium Halo Circle Indicator */}
                                          <div className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all duration-300 z-10 cursor-pointer ${ringClass}`}>
                                            {isFailedStage ? (
                                              <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none">
                                                <motion.path
                                                  d="M2.5 2.5L9.5 9.5"
                                                  stroke="currentColor"
                                                  strokeWidth="2.5"
                                                  strokeLinecap="round"
                                                  initial={{ pathLength: 0 }}
                                                  animate={{ pathLength: 1 }}
                                                  transition={{ delay: sIdx * segmentDuration + 0.15, duration: 0.20, ease: "easeOut" }}
                                                />
                                                <motion.path
                                                  d="M9.5 2.5L2.5 9.5"
                                                  stroke="currentColor"
                                                  strokeWidth="2.5"
                                                  strokeLinecap="round"
                                                  initial={{ pathLength: 0 }}
                                                  animate={{ pathLength: 1 }}
                                                  transition={{ delay: sIdx * segmentDuration + 0.25, duration: 0.20, ease: "easeOut" }}
                                                />
                                              </svg>
                                            ) : isPostDisqualification ? (
                                              <svg className="h-2.5 w-2.5 text-rose-500/60" viewBox="0 0 12 12" fill="none">
                                                <path
                                                  d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5"
                                                  stroke="currentColor"
                                                  strokeWidth="2"
                                                  strokeLinecap="round"
                                                />
                                              </svg>
                                            ) : stage.result === 'qualified' ? (
                                              <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none">
                                                <motion.path
                                                  d="M2.5 6L5 8.5L9.5 3.5"
                                                  stroke="currentColor"
                                                  strokeWidth="2.5"
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  initial={{ pathLength: 0 }}
                                                  animate={{ pathLength: 1 }}
                                                  transition={{ delay: sIdx * segmentDuration + 0.15, duration: 0.25, ease: "easeOut" }}
                                                />
                                              </svg>
                                            ) : isFirstPending ? (
                                              <div className="h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400 relative">
                                                <div className="absolute inset-0 rounded-full bg-blue-500 dark:bg-blue-400 animate-ping opacity-75" />
                                              </div>
                                            ) : (
                                              <div className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                            )}
                                          </div>

                                          {/* Elegant Caret & Tooltip Card overlay below the dot */}
                                          {(() => {
                                            const totalStages = competitiveStages.length;
                                            const isFirst = sIdx === 0;
                                            const isLast = sIdx === totalStages - 1;

                                            // Positional anchor (horizontal alignment)
                                            const tooltipPositionClass = isFirst
                                              ? 'left-[-20px]'
                                              : isLast
                                                ? 'right-[-20px]'
                                                : 'left-1/2 -translate-x-1/2';

                                            // Left accent border color by status
                                            const accentBorder =
                                              hoverStatusText === 'qualified'
                                                ? 'border-l-emerald-500'
                                                : hoverStatusText === 'rejected' || hoverStatusText === 'disqualified'
                                                  ? 'border-l-rose-500'
                                                  : hoverStatusText === 'pending'
                                                    ? 'border-l-blue-500'
                                                    : 'border-l-zinc-300 dark:border-l-zinc-650';

                                            return (
                                              <>
                                                {/* Perfect Caret Indicator - always centered under the dot */}
                                                <div className="absolute top-[32px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white dark:bg-zinc-900 border-l border-t border-zinc-200/80 dark:border-zinc-700/80 rotate-45 z-31 pointer-events-none transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-103" />
                                                
                                                {/* Timeline Card content */}
                                                <div className={`absolute top-[36px] ${tooltipPositionClass} pointer-events-auto z-30 w-[130px] h-[96px] group-hover:h-auto transition-all duration-300 group-hover:-translate-y-0.5 group-hover:scale-103`}>
                                                  <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 border-l-2 ${accentBorder} rounded-lg shadow-md hover:shadow-xl dark:shadow-zinc-950/50 py-2 px-2.5 text-left w-full h-full min-h-[94px] flex flex-col justify-between transition-shadow duration-300`}>
                                                    <div className="min-w-0 flex-1 flex flex-col justify-start">
                                                      <p className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 leading-tight line-clamp-2" title={stage.name}>
                                                        {stage.name}
                                                      </p>
                                                    </div>
                                                    <div className="mt-1.5 shrink-0">
                                                      <p className="text-[8.5px] text-zinc-450 dark:text-zinc-500 font-semibold leading-none">
                                                        Deadline: {formatDate(stage.deadline)}
                                                      </p>
                                                      <p className={`text-[8px] font-extrabold uppercase tracking-widest mt-1 leading-none ${statusColorLabel}`}>
                                                        {hoverStatusText}
                                                      </p>
                                                    </div>
                                                    {stage.notes && (
                                                      <p className="text-[8.5px] text-zinc-500 dark:text-zinc-450 italic border-zinc-100 dark:border-zinc-800 leading-normal max-h-0 opacity-0 group-hover:max-h-[80px] group-hover:opacity-100 group-hover:mt-2 group-hover:border-t group-hover:pt-1.5 transition-all duration-300 ease-in-out overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                                                        {stage.notes}
                                                      </p>
                                                    )}
                                                  </div>
                                                </div>
                                              </>
                                            );
                                          })()}
                                        </motion.div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 2. MEMBERS TAB: Teammate Listing & Smart Access Control */}
              {activeTab === "Members" && (() => {
                const isOwner = selectedTeam.owner._id === user?._id;
                const roster = [selectedTeam.owner, ...selectedTeam.members];
                
                // Filter roster by search query
                const filteredRoster = roster.filter(member => {
                  const name = (member.fullName || "").toLowerCase();
                  const username = (member.username || "").toLowerCase();
                  const email = (member.email || "").toLowerCase();
                  const query = rosterSearchQuery.toLowerCase().trim();
                  return name.includes(query) || username.includes(query) || email.includes(query);
                });

                return (
                  <div className="space-y-8 animate-fade-in">
                    {/* Welcome / Header Section */}
                    <div className="bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-transparent border border-blue-500/15 dark:border-blue-500/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
                            <Users className="h-5 w-5" />
                          </span>
                          <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">Team Workspace</h3>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
                          Manage your team members, invite new teammates, and check hackathon registrations. Sharing this workspace syncs your stages and progress notes automatically.
                        </p>
                      </div>
                      
                      <div className="flex gap-3.5 shrink-0">
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-center min-w-[90px] shadow-sm">
                          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Team Size</p>
                          <p className="text-lg font-black text-zinc-850 dark:text-zinc-100 mt-0.5">{roster.length}</p>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-center min-w-[90px] shadow-sm">
                          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Pending</p>
                          <p className="text-lg font-black text-zinc-850 dark:text-zinc-100 mt-0.5">
                            {teamInvitations.filter(i => i.status === 'pending').length}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Main Layout Grid */}
                    <div className="grid gap-8 lg:grid-cols-[1fr_360px] items-start">
                      
                      {/* LEFT COLUMN: Roster Listing & Pending Invites */}
                      <div className="space-y-8 min-w-0">
                        
                        {/* Active Roster Box */}
                        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                            <div>
                              <h4 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">Team Members</h4>
                              <p className="text-xs text-zinc-400 dark:text-zinc-550 mt-0.5">People collaborating in this team.</p>
                            </div>
                            
                            {/* Roster Search Bar */}
                            <div className="relative max-w-xs w-full sm:w-60">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                                <Search className="h-3.5 w-3.5" />
                              </span>
                              <input
                                type="text"
                                value={rosterSearchQuery}
                                onChange={(e) => setRosterSearchQuery(e.target.value)}
                                placeholder="Filter by name or email..."
                                className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50/50 text-xs text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:focus:bg-zinc-950"
                              />
                              {rosterSearchQuery && (
                                <button
                                  onClick={() => setRosterSearchQuery("")}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-650"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Member List Grid */}
                          {filteredRoster.length === 0 ? (
                            <div className="text-center py-10 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800/80">
                              <Users className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700" />
                              <p className="mt-2 text-xs font-semibold text-zinc-500 dark:text-zinc-450">No team members found</p>
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-555 mt-0.5">Try filtering with a different name or email address.</p>
                            </div>
                          ) : (
                            <div className="grid gap-3 sm:grid-cols-2">
                              {filteredRoster.map((member) => {
                                const isMemberOwner = member._id === selectedTeam.owner._id;
                                const isCurrentUser = member._id === user?._id;
                                
                                return (
                                  <div 
                                    key={member._id} 
                                    className="group relative rounded-xl border border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900/60 flex items-center justify-between gap-3 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-750 hover:shadow-xs transition-all duration-200"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      {/* Avatar */}
                                      <div className={`flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl font-bold uppercase text-xs text-white bg-gradient-to-br ${getGradientClass(member.fullName || member.username || member._id)}`}>
                                        {(member.fullName || member.username || "?").slice(0, 2)}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-zinc-900 dark:text-white truncate flex items-center gap-1.5">
                                          {member.fullName || member.username}
                                          {isCurrentUser && (
                                            <span className="text-[8.5px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-400/10 px-1.5 py-0.5 rounded-md">You</span>
                                          )}
                                        </p>
                                        <p className="text-[10px] text-zinc-450 dark:text-zinc-500 truncate mt-0.5">{member.email || "No email linked"}</p>
                                      </div>
                                    </div>

                                    {/* Role & Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className={`rounded-full px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider ${
                                        isMemberOwner
                                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                          : "bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-400 dark:border-zinc-700"
                                      }`}>
                                        {isMemberOwner ? "Owner" : "Member"}
                                      </span>

                                      {/* Remove Member button for Owner */}
                                      {isOwner && !isMemberOwner && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setRemoveMemberModal({ id: member._id, name: member.fullName || member.username || "Teammate" });
                                          }}
                                          className="p-1 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/5 transition opacity-0 group-hover:opacity-100 duration-150 focus:opacity-100"
                                          title="Remove Teammate"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Pending Invites Box */}
                        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
                          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                            <div>
                              <h4 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">Sent Invitations</h4>
                              <p className="text-xs text-zinc-400 dark:text-zinc-550 mt-0.5">Track invitations sent to other team members.</p>
                            </div>
                            <button 
                              onClick={loadTeamInvitations} 
                              disabled={invitationsLoading}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/5 rounded-lg border border-transparent hover:border-blue-500/10 transition disabled:opacity-50"
                            >
                              Refresh
                            </button>
                          </div>

                          {invitationsLoading ? (
                            <div className="flex justify-center py-6">
                              <LogoTransition width={24} height={16} loop={true} />
                            </div>
                          ) : teamInvitations.length === 0 ? (
                            <div className="text-center py-8 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800/80">
                              <Mail className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700" />
                              <p className="mt-2 text-xs font-semibold text-zinc-500 dark:text-zinc-450">No outgoing invites yet</p>
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-555 mt-0.5">Use the Invite Hub on the right to send invitations.</p>
                            </div>
                          ) : (
                            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                              {teamInvitations.map(invite => {
                                const isExpired = invite.status === 'expired';
                                const isDeclined = invite.status === 'declined';
                                const isAccepted = invite.status === 'accepted';
                                
                                return (
                                  <div key={invite._id} className="flex items-center justify-between gap-3 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-xl">
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                                        {invite.invitedUser
                                          ? `@${invite.invitedUser.username}`
                                          : invite.invitedEmail}
                                      </p>
                                      <p className="text-[9.5px] text-zinc-450 dark:text-zinc-500 mt-0.5 leading-relaxed">
                                        Sent by @{invite.invitedBy.username} · Expires {formatDate(invite.expiresAt)}
                                      </p>
                                    </div>
                                    
                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[8.5px] font-extrabold uppercase border ${
                                      isAccepted
                                        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                        : isExpired
                                        ? "border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400"
                                        : isDeclined
                                        ? "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-455"
                                        : "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                    }`}>
                                      {invite.status}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* RIGHT COLUMN: Invite Hub Card */}
                      <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-5">
                        <div className="space-y-1">
                          <h4 className="text-xs font-extrabold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                            Invite & Join Hub
                          </h4>
                          <p className="text-[11px] text-zinc-450 dark:text-zinc-500 leading-relaxed">
                            Add teammates directly or share access details. Only the team owner can invite new members or generate join codes/links.
                          </p>
                        </div>

                        {/* Interactive Invite Tabs */}
                        <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-950 p-1">
                          <button
                            type="button"
                            onClick={() => setInviteTab('direct')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold rounded-lg transition-all ${
                              inviteTab === 'direct'
                                ? "bg-white text-blue-600 shadow-xs dark:bg-zinc-900 dark:text-blue-400"
                                : "text-zinc-500 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-zinc-200"
                            }`}
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            Search
                          </button>
                          <button
                            type="button"
                            onClick={() => setInviteTab('code')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold rounded-lg transition-all ${
                              inviteTab === 'code'
                                ? "bg-white text-blue-600 shadow-xs dark:bg-zinc-900 dark:text-blue-400"
                                : "text-zinc-500 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-zinc-200"
                            }`}
                          >
                            <Key className="h-3.5 w-3.5" />
                            Join Code
                          </button>
                          <button
                            type="button"
                            onClick={() => setInviteTab('email')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold rounded-lg transition-all ${
                              inviteTab === 'email'
                                ? "bg-white text-blue-600 shadow-xs dark:bg-zinc-900 dark:text-blue-400"
                                : "text-zinc-500 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-zinc-200"
                            }`}
                          >
                            <Mail className="h-3.5 w-3.5" />
                            Email Link
                          </button>
                        </div>

                        {/* Tab Content Display */}
                        <div className="pt-2 min-h-[170px] flex flex-col justify-between">
                          
                          {/* TAB 1: DIRECT USER SEARCH INVITE */}
                          {inviteTab === 'direct' && (
                            <div className="space-y-4">
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wide">
                                  <Sparkles className="h-3 w-3 text-blue-500" />
                                  1. Search Registered Users
                                </span>
                                <p className="text-[10.5px] text-zinc-400 dark:text-zinc-550 leading-relaxed">
                                  Lookup HackDekh users by username/email and invite them straight to their dashboard.
                                </p>
                              </div>

                              {isOwner ? (
                                <div className="relative">
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                                      <Search className="h-3.5 w-3.5" />
                                    </span>
                                    <input
                                      type="text"
                                      value={directInviteSearchText}
                                      onChange={e => handleDirectInviteSearch(e.target.value)}
                                      placeholder="Type username or email address..."
                                      className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-zinc-200 bg-zinc-50/50 text-zinc-850 outline-none transition focus:border-blue-400 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:focus:bg-zinc-950"
                                    />
                                    {directInviteLoading && (
                                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <LogoTransition width={20} height={14} loop={true} />
                                      </div>
                                    )}
                                  </div>

                                  {/* Direct Invite Autocomplete Results */}
                                  {directInviteResults.length > 0 && (
                                    <div className="absolute left-0 right-0 mt-2 z-50 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 max-h-52 overflow-y-auto space-y-0.5">
                                      {directInviteResults.map(user => (
                                        <div
                                          key={user._id}
                                          className="flex items-center justify-between p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 rounded-lg transition"
                                        >
                                          <div className="min-w-0">
                                            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                              {user.fullName || user.username}
                                            </p>
                                            <p className="text-[10px] text-zinc-450 dark:text-zinc-500 truncate">
                                              @{user.username}
                                            </p>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleSendDirectInvite(user._id)}
                                            disabled={savingTeam}
                                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                                          >
                                            <Plus className="h-3 w-3" />
                                            Invite
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {directInviteSearchText.trim() && !directInviteLoading && directInviteResults.length === 0 && (
                                    <p className="text-[10px] text-rose-500 font-bold mt-2">No active users found matching query.</p>
                                  )}
                                </div>
                              ) : (
                                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950 p-3 border border-zinc-150 dark:border-zinc-900 text-center">
                                  <p className="text-[10px] text-zinc-455 dark:text-zinc-500 leading-normal">
                                    Only the owner ({selectedTeam.owner.fullName || selectedTeam.owner.username}) can search and invite other users.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* TAB 2: JOIN CODE */}
                          {inviteTab === 'code' && (
                            <div className="space-y-4">
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-wide">
                                  <Sparkles className="h-3 w-3 text-blue-500" />
                                  2. Copy Secret Join Code
                                </span>
                                <p className="text-[10.5px] text-zinc-400 dark:text-zinc-550 leading-relaxed">
                                  Give this code to a teammate. They can click "Join Team" on their dashboard and enter it to join instantly.
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl px-4 py-2.5 font-mono text-sm tracking-widest font-black text-zinc-800 dark:text-zinc-100 flex-1 text-center shadow-xs">
                                  {selectedTeam.code || "------"}
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (selectedTeam.code) {
                                      await navigator.clipboard.writeText(selectedTeam.code);
                                      setCopiedCode(true);
                                      setTimeout(() => setCopiedCode(false), 2000);
                                      showToast("Join code copied!", "success");
                                    }
                                  }}
                                  disabled={!selectedTeam.code}
                                  className={`btn py-2 px-3 text-xs w-auto h-auto min-h-[38px] shrink-0 shadow-xs inline-flex items-center gap-1 ${
                                    copiedCode 
                                      ? "bg-emerald-600 hover:bg-emerald-500 text-white border-transparent" 
                                      : "btn-secondary"
                                  }`}
                                >
                                  {copiedCode ? (
                                    <>
                                      <Check className="h-3.5 w-3.5" />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3.5 w-3.5" />
                                      Copy
                                    </>
                                  )}
                                </button>
                                
                                {isOwner && (
                                  <button
                                    type="button"
                                    onClick={handleRegenerateCode}
                                    disabled={regeneratingCode}
                                    className="btn btn-ghost border border-zinc-205 dark:border-zinc-800 p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 shrink-0 w-9.5 h-9.5 flex items-center justify-center rounded-xl animate-fade-in"
                                    title="Regenerate Join Code"
                                  >
                                    {regeneratingCode ? (
                                      <LogoTransition width={20} height={14} loop={true} />
                                    ) : (
                                      <RotateCcw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* TAB 3: GENERATE LEGACY EMAIL LINK */}
                          {inviteTab === 'email' && (
                            <div className="space-y-4">
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-wide">
                                  <Sparkles className="h-3 w-3 text-blue-500" />
                                  3. Create Invitation Link
                                </span>
                                <p className="text-[10.5px] text-zinc-400 dark:text-zinc-550 leading-relaxed">
                                  Generate a shareable signup link configured specifically for a teammate's email address.
                                </p>
                              </div>

                              {isOwner ? (
                                <div className="space-y-3">
                                  <div className="flex gap-2">
                                    <input
                                      type="email"
                                      value={inviteEmail}
                                      onChange={e => setInviteEmail(e.target.value)}
                                      placeholder="teammate@example.com"
                                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-zinc-50/50 text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                                      onKeyDown={e => e.key === 'Enter' && handleInvite()}
                                    />
                                    <button
                                      onClick={handleInvite}
                                      disabled={savingTeam || !inviteEmail.trim()}
                                      className="btn btn-primary px-3 py-2 text-xs h-auto w-auto min-h-[36px] font-bold shadow-xs shrink-0 flex items-center gap-1"
                                    >
                                      {savingTeam ? <LogoTransition width={20} height={14} loop={true} /> : <Plus className="h-3.5 w-3.5" />}
                                      Create
                                    </button>
                                  </div>

                                  {inviteLink && (
                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/10 p-2.5 space-y-1.5 shadow-xs animate-scale-in">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[8.5px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                          Link Ready
                                        </span>
                                        <button 
                                          onClick={handleCopyInvite} 
                                          className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                                        >
                                          <Copy className="h-3 w-3" />
                                          Copy Link
                                        </button>
                                      </div>
                                      <p className="text-[10px] text-zinc-650 dark:text-zinc-350 font-mono truncate bg-white/60 dark:bg-zinc-950/40 rounded p-1 border border-zinc-150 dark:border-zinc-900">
                                        {inviteLink.invitationLink}
                                      </p>
                                      <p className="text-[8.5px] text-zinc-450 dark:text-zinc-500">
                                        For: {inviteLink.invitedEmail} · Expiry: {formatDate(inviteLink.expiresAt)}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950 p-3 border border-zinc-150 dark:border-zinc-900 text-center">
                                  <p className="text-[10px] text-zinc-455 dark:text-zinc-500 leading-normal">
                                    Only the owner ({selectedTeam.owner.fullName || selectedTeam.owner.username}) can generate external email invite links.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      </div>

                    </div>
                  </div>
                );
              })()}

              {/* 3. STAGES TAB: Stages Editor */}
              {activeTab === "Stages" && (
                <div className="space-y-6">
                  {loadingTeamData ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200/60 bg-white px-4 py-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400 shadow-xs">
                      <LogoTransition width={200} height={130} loop={true} />
                      <p className="font-semibold">Loading stages list...</p>
                    </div>
                  ) : selectedParticipation ? (() => {
                    const competitiveStages = selectedParticipation.stages.filter(s => !isRegistrationStage(s.name));
                    const failedStageIdx = competitiveStages.findIndex(s => s.result === 'rejected');
                    const hasRejections = failedStageIdx !== -1;
                    const isTerminated = hasRejections || ['won', 'eliminated'].includes(selectedParticipation.status);

                    return (
                      <>
                        {/* Dropdown to pick which participation to edit */}
                        <div className="flex items-center justify-between gap-4 pb-3.5 border-b border-zinc-150 dark:border-zinc-800">
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-500">Select hackathon:</span>
                          <AppDropdown
                            value={selectedParticipationId}
                            onChange={setSelectedParticipationId}
                            options={teamParticipations.map(p => ({
                              label: p.hackathon.title,
                              value: p._id,
                            }))}
                            placeholder="Choose hackathon…"
                            fullWidth={false}
                          />
                        </div>

                        {/* Stages list editor */}
                        <div className="space-y-4">
                          {(() => {
                            if (competitiveStages.length === 0) {
                              return (
                                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/30 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/10">
                                  <CalendarRange className="mx-auto h-10 w-10 text-zinc-400" />
                                  <h4 className="mt-3 text-sm font-bold text-zinc-900 dark:text-white">No milestones defined</h4>
                                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Create stages like "Ideation", "Prototype Submission", etc.</p>
                                </div>
                              );
                            }
                            return competitiveStages.map((stage, sIdx) => {
                              const isDisqualified = failedStageIdx !== -1 && sIdx > failedStageIdx;
                              const isStageEditable = !isDisqualified && selectedParticipation.status !== 'won';

                              return (
                                <div id={`stage-${stage._id}`} key={stage._id} className={`rounded-xl border p-4 transition-all duration-200 ${isDisqualified ? "border-dashed border-zinc-250 bg-zinc-50/50 dark:border-zinc-800/40 dark:bg-zinc-950/20 opacity-50" : "border-zinc-200 bg-white dark:border-zinc-800/60 dark:bg-zinc-900/60 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700"}`}>
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 flex items-center gap-2">
                                      {isDisqualified && (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-zinc-200 px-2 py-0.5 text-[9px] font-black uppercase text-zinc-655 dark:bg-zinc-800 dark:text-zinc-400 shrink-0">
                                          Disqualified
                                        </span>
                                      )}
                                      <input
                                        disabled={!isStageEditable}
                                        defaultValue={stage.name}
                                        onBlur={(event) => {
                                          if (event.target.value !== stage.name) {
                                            handleUpdateStage(selectedParticipation._id, stage._id, { name: event.target.value });
                                          }
                                        }}
                                        className="w-full bg-transparent text-sm font-bold text-zinc-900 dark:text-white outline-none border-b border-transparent focus:border-blue-500 py-0.5 disabled:cursor-not-allowed"
                                      />
                                    </div>
                                    <button
                                      onClick={() => handleDeleteStage(selectedParticipation._id, stage._id, stage.name)}
                                      disabled={!isStageEditable}
                                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-500 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                      title="Delete stage"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/60 text-xs">
                                    <div>
                                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Deadline</label>
                                      <input
                                        type="date"
                                        disabled={!isStageEditable}
                                        defaultValue={stage.deadline ? new Date(stage.deadline).toISOString().slice(0, 10) : ""}
                                        onBlur={(event) => {
                                          const nextDeadline = event.target.value || null;
                                          const currentDeadline = stage.deadline ? new Date(stage.deadline).toISOString().slice(0, 10) : "";
                                          if (nextDeadline !== currentDeadline) {
                                            handleUpdateStage(selectedParticipation._id, stage._id, { deadline: nextDeadline });
                                          }
                                        }}
                                        className="rounded-lg border border-zinc-200 bg-zinc-50/50 px-2.5 py-1 text-xs text-zinc-700 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 disabled:cursor-not-allowed"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Result</label>
                                      <AppDropdown
                                        value={isDisqualified ? "pending" : stage.result}
                                        disabled={!isStageEditable}
                                        onChange={(val) => {
                                          if (val !== stage.result) {
                                            handleUpdateStage(selectedParticipation._id, stage._id, { result: val as Stage["result"] });
                                          }
                                        }}
                                        options={[
                                          { label: "Pending", value: "pending", dotClass: "bg-amber-500" },
                                          { label: "Qualified", value: "qualified", dotClass: "bg-emerald-500" },
                                          { label: "Rejected", value: "rejected", dotClass: "bg-rose-500" },
                                        ]}
                                        placeholder="Result"
                                        className="!w-36"
                                      />
                                    </div>

                                    {stageSaving[stage._id] && (
                                      <span className="text-[10px] text-zinc-400 ml-auto pt-4">
                                        {stageSaving[stage._id] === "saving" ? "Saving..." : stageSaving[stage._id] === "saved" ? "Saved" : "Error"}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>

                        {/* Add stage form */}
                        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800/60 dark:bg-zinc-900/60 shadow-xs mt-6">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Add Stage Milestone</h4>
                          {isTerminated && (
                            <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 font-semibold leading-normal">
                              Milestone tracking locked (this participation is marked as won or eliminated). You cannot add new stages.
                            </p>
                          )}
                          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px]">
                            <input
                              value={newStageDraft[selectedParticipation._id]?.name || ""}
                              disabled={isTerminated}
                              onChange={(event) =>
                                setNewStageDraft((current) => ({
                                  ...current,
                                  [selectedParticipation._id]: {
                                    name: event.target.value,
                                    deadline: current[selectedParticipation._id]?.deadline || "",
                                  },
                                }))
                              }
                              placeholder="e.g. Round 2: Video Pitch"
                              className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-800 outline-none transition focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-50 dark:disabled:bg-zinc-900/40 disabled:text-zinc-400"
                            />
                            <input
                              type="date"
                              value={newStageDraft[selectedParticipation._id]?.deadline || ""}
                              disabled={isTerminated}
                              onChange={(event) =>
                                setNewStageDraft((current) => ({
                                  ...current,
                                  [selectedParticipation._id]: {
                                    name: current[selectedParticipation._id]?.name || "",
                                    deadline: event.target.value,
                                  },
                                }))
                              }
                              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-50 dark:disabled:bg-zinc-900/40 disabled:text-zinc-400"
                            />
                          </div>
                          <button
                            onClick={() => handleAddStage(selectedParticipation._id)}
                            disabled={isTerminated}
                            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="h-4 w-4" />
                            Add Stage
                          </button>
                        </div>
                      </>
                    );
                  })() : (
                    <div className="rounded-xl border border-dashed border-zinc-250 bg-zinc-50/30 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/10">
                      <CalendarRange className="mx-auto h-10 w-10 text-zinc-400" />
                      <h4 className="mt-3 text-sm font-bold text-zinc-900 dark:text-white">No active trackings</h4>
                      <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">Join a hackathon to start configuring tracking stage paths.</p>
                    </div>
                  )}
                </div>
              )}


              {/* 4. SETTINGS TAB: GitHub-style settings with sub-navigation */}
              {activeTab === "Settings" && (() => {
                const isOwner = selectedTeam.owner._id === user?._id;

                const settingsNavItems = [
                  { id: 'general' as const, label: 'General' },
                  { id: 'members' as const, label: 'Members' },
                  { id: 'invitations' as const, label: 'Invitations' },
                  { id: 'danger' as const, label: 'Danger Zone', danger: true },
                ];

                const settingsInputCls = "w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:bg-zinc-950";

                return (
                  <div>
                    {/* Page heading */}
                    <div className="mb-7 pb-5 border-b border-zinc-200 dark:border-zinc-800">
                      <h2 className="text-lg font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">Team Settings</h2>
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                        Manage workspace configuration, members, and invitations for <strong className="text-zinc-700 dark:text-zinc-300">{selectedTeam.name}</strong>.
                      </p>
                    </div>

                    <div className="flex gap-10 md:gap-14">
                      {/* Left sub-nav */}
                      <nav className="hidden md:flex flex-col gap-0.5 w-36 shrink-0">
                        {settingsNavItems.map(item => {
                          const isActive = settingsSection === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                setSettingsSection(item.id);
                                if (item.id === 'invitations') loadTeamInvitations();
                              }}
                              className={`relative flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-medium text-left transition-colors ${
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
                                <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full ${item.danger ? "bg-rose-500" : "bg-blue-600 dark:bg-blue-400"}`} />
                              )}
                              {item.label}
                            </button>
                          );
                        })}
                      </nav>

                      {/* Mobile tabs */}
                      <div className="flex md:hidden gap-1 mb-5 flex-wrap w-full">
                        {settingsNavItems.map(item => {
                          const isActive = settingsSection === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => { setSettingsSection(item.id); if (item.id === 'invitations') loadTeamInvitations(); }}
                              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${isActive ? item.danger ? "bg-rose-600 text-white" : "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"}`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Right content */}
                      <div className="flex-1 min-w-0">

                        {/* GENERAL */}
                        {settingsSection === 'general' && (
                          <div>
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">General</h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">Basic workspace configuration.</p>

                            <form onSubmit={handleRenameTeam} className="space-y-5">
                              {/* Team name */}
                              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-6 pb-5 border-b border-zinc-100 dark:border-zinc-800">
                                <div className="sm:w-40 shrink-0">
                                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 block">Team Name</label>
                                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Visible to all members.</p>
                                </div>
                                <div className="flex-1 space-y-2">
                                  <input
                                    value={renameTeamName}
                                    onChange={e => setRenameTeamName(e.target.value)}
                                    placeholder={selectedTeam.name}
                                    className={settingsInputCls}
                                    disabled={!isOwner}
                                  />
                                  {!isOwner && <p className="text-xs text-zinc-400 dark:text-zinc-500">Only the team owner can rename the workspace.</p>}
                                </div>
                              </div>

                              {/* Join Code */}
                              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-6 pb-5 border-b border-zinc-100 dark:border-zinc-800">
                                <div className="sm:w-40 shrink-0">
                                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 block">Join Code</label>
                                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Quick team joining code.</p>
                                </div>
                                <div className="flex-1 space-y-3">
                                  <div className="flex items-center gap-3">
                                    <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 font-mono text-sm tracking-wider font-extrabold text-zinc-855 dark:text-zinc-100">
                                      {selectedTeam.code || "------"}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (selectedTeam.code) {
                                          await navigator.clipboard.writeText(selectedTeam.code);
                                          showToast("Join code copied!", "success");
                                        }
                                      }}
                                      disabled={!selectedTeam.code}
                                      className="btn btn-secondary py-2 px-3 text-xs w-auto h-auto min-w-[70px]"
                                    >
                                      Copy
                                    </button>
                                    {isOwner && (
                                      <button
                                        type="button"
                                        onClick={handleRegenerateCode}
                                        disabled={regeneratingCode}
                                        className="btn btn-ghost py-2 px-3 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 w-auto h-auto"
                                      >
                                        {regeneratingCode ? "Regenerating..." : "Regenerate"}
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-zinc-450 dark:text-zinc-550 leading-normal">
                                    Teammates can enter this 6-character code on their dashboard / join screen to immediately join this team.
                                  </p>
                                </div>
                              </div>

                              {/* Metadata */}
                              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-6 pb-5 border-b border-zinc-100 dark:border-zinc-800">
                                <div className="sm:w-40 shrink-0">
                                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Workspace Info</p>
                                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Read-only metadata.</p>
                                </div>
                                <div className="flex-1 space-y-2 text-xs">
                                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                                    <span className="font-semibold text-zinc-500 dark:text-zinc-500 w-16">Owner</span>
                                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{selectedTeam.owner.fullName || selectedTeam.owner.username}</span>
                                    {isOwner && <span className="rounded-full bg-blue-500/10 border border-blue-500/25 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">You</span>}
                                  </div>
                                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                                    <span className="font-semibold text-zinc-500 dark:text-zinc-500 w-16">Members</span>
                                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{selectedTeam.members.length + 1} people</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                                    <span className="font-semibold text-zinc-500 dark:text-zinc-500 w-16">Created</span>
                                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{formatDate(selectedTeam.createdAt)}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                                    <span className="font-semibold text-zinc-500 dark:text-zinc-500 w-16">Your role</span>
                                    <span className={`font-bold ${isOwner ? "text-blue-600 dark:text-blue-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                                      {isOwner ? "Owner" : "Member"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {isOwner && (
                                <div className="flex justify-end pt-1">
                                  <button type="submit" disabled={savingTeam || !renameTeamName.trim()} className="btn btn-primary">
                                    {savingTeam ? <LogoTransition width={28} height={18} loop={true} /> : null}
                                    Save changes
                                  </button>
                                </div>
                              )}
                            </form>
                          </div>
                        )}

                        {/* MEMBERS */}
                        {settingsSection === 'members' && (
                          <div>
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">Members</h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
                              {isOwner ? "Manage who has access to this workspace." : "People who are part of this workspace."}
                            </p>

                            {/* Owner row */}
                            <div className="space-y-1">
                              {[selectedTeam.owner, ...selectedTeam.members].map((member, idx) => {
                                const isOwnerRow = idx === 0;
                                const isCurrentUser = member._id === user?._id;
                                const canRemove = isOwner && !isOwnerRow && !isCurrentUser;

                                return (
                                  <div
                                    key={member._id}
                                    className="flex items-center justify-between gap-3 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      {/* Avatar */}
                                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white bg-gradient-to-br ${getGradientClass(member.fullName || member.username || member._id)}`}>
                                        {(member.fullName || member.username || "?").slice(0, 2).toUpperCase()}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                                          {member.fullName || member.username}
                                          {isCurrentUser && <span className="ml-1.5 text-[10px] font-bold text-zinc-400">(you)</span>}
                                        </p>
                                        {member.username && (
                                          <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">@{member.username}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {isOwnerRow ? (
                                        <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">Owner</span>
                                      ) : (
                                        <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400">Member</span>
                                      )}
                                      {canRemove && (
                                        <button
                                          onClick={() => setRemoveMemberModal({ id: member._id, name: member.fullName || member.username || member._id })}
                                          className="btn btn-ghost btn-sm text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 h-7 px-2 rounded-lg"
                                        >
                                          Remove
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {!isOwner && (
                              <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl px-4 py-3 border border-zinc-100 dark:border-zinc-800">
                                Only the team owner can remove members. Contact <strong className="text-zinc-600 dark:text-zinc-400">{selectedTeam.owner.fullName || selectedTeam.owner.username}</strong> to make changes.
                              </p>
                            )}
                          </div>
                        )}

                        {/* INVITATIONS */}
                        {settingsSection === 'invitations' && (
                          <div>
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">Invitations</h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
                              {isOwner ? "Generate invite links and view pending invitations." : "View pending invitations for this team."}
                            </p>

                             {/* In-App Direct Invite (owner only) */}
                             {isOwner && (
                               <div className="pb-6 mb-6 border-b border-zinc-100 dark:border-zinc-800 space-y-4">
                                 <div>
                                   <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Direct Team Invite</p>
                                   <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Search and invite active HackDekh developers directly.</p>
                                 </div>
                                 <div className="relative">
                                   <div className="flex gap-2">
                                     <input
                                       type="text"
                                       value={directInviteSearchText}
                                       onChange={e => handleDirectInviteSearch(e.target.value)}
                                       placeholder="Search by username or email..."
                                       className={`${settingsInputCls} flex-1`}
                                     />
                                     {directInviteLoading && (
                                       <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                         <LogoTransition width={24} height={16} loop={true} />
                                       </div>
                                     )}
                                   </div>

                                   {/* Direct Invite Autocomplete Results */}
                                   {directInviteResults.length > 0 && (
                                     <div className="absolute left-0 right-0 mt-2 z-50 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 max-h-52 overflow-y-auto space-y-1">
                                       {directInviteResults.map(user => (
                                         <div
                                           key={user._id}
                                           className="flex items-center justify-between p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 rounded-lg transition"
                                         >
                                           <div className="min-w-0">
                                             <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                               {user.fullName || user.username}
                                             </p>
                                             <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                                               @{user.username} · {user.email}
                                             </p>
                                           </div>
                                           <button
                                             type="button"
                                             onClick={() => handleSendDirectInvite(user._id)}
                                             disabled={savingTeam}
                                             className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                                           >
                                             Invite
                                           </button>
                                         </div>
                                       ))}
                                     </div>
                                   )}

                                   {directInviteSearchText.trim() && !directInviteLoading && directInviteResults.length === 0 && (
                                     <p className="text-[11px] text-rose-500 font-medium mt-1">No users found matching query.</p>
                                   )}
                                 </div>
                               </div>
                             )}

                             {/* Generate legacy invite link (owner only) */}
                             {isOwner && (
                               <div className="pb-6 mb-6 border-b border-zinc-100 dark:border-zinc-800">
                                 <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Generate Invite Link</p>
                                 <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mb-3">Or create a shareable invitation link for email delivery.</p>
                                 <div className="flex gap-2">
                                   <input
                                     type="email"
                                     value={inviteEmail}
                                     onChange={e => setInviteEmail(e.target.value)}
                                     placeholder="teammate@example.com"
                                     className={`${settingsInputCls} flex-1`}
                                     onKeyDown={e => e.key === 'Enter' && handleInvite()}
                                   />
                                   <button
                                     onClick={handleInvite}
                                     disabled={savingTeam || !inviteEmail.trim()}
                                     className="btn btn-primary shrink-0"
                                   >
                                     {savingTeam ? <LogoTransition width={28} height={18} loop={true} /> : null}
                                     Send invite
                                   </button>
                                 </div>

                                 {inviteLink && (
                                   <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/10 p-3 flex items-center gap-3">
                                     <div className="flex-1 min-w-0">
                                       <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-0.5">Invite link generated</p>
                                       <p className="text-xs text-zinc-600 dark:text-zinc-400 font-mono truncate">{inviteLink.invitationLink}</p>
                                       <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                                         For: {inviteLink.invitedEmail} · Expires: {formatDate(inviteLink.expiresAt)}
                                       </p>
                                     </div>
                                     <button onClick={handleCopyInvite} className="btn btn-secondary btn-sm shrink-0">
                                       <Copy className="h-3.5 w-3.5" /> Copy
                                     </button>
                                   </div>
                                 )}
                               </div>
                             )}

                            {/* Invitations list */}
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Pending Invitations</p>
                                <button onClick={loadTeamInvitations} disabled={invitationsLoading} className="btn btn-ghost btn-sm text-xs h-7 px-2 rounded-lg">
                                  {invitationsLoading ? <LogoTransition width={20} height={14} loop={true} /> : "Refresh"}
                                </button>
                              </div>

                              {invitationsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                  <LogoTransition width={36} height={24} loop={true} />
                                </div>
                              ) : teamInvitations.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 py-8 text-center">
                                  <p className="text-sm text-zinc-400 dark:text-zinc-500">No invitations yet.</p>
                                  <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1">Generate a link above to invite teammates.</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {teamInvitations.map(invite => (
                                    <div key={invite._id} className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{invite.invitedEmail}</p>
                                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                                          Expires {formatDate(invite.expiresAt)}
                                        </p>
                                      </div>
                                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                                        invite.status === 'accepted'
                                          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                          : invite.status === 'expired'
                                          ? "border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400"
                                          : invite.status === 'declined'
                                          ? "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                          : "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                      }`}>
                                        {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* DANGER ZONE */}
                        {settingsSection === 'danger' && (
                          <div>
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">Danger Zone</h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
                              Irreversible and destructive workspace actions.
                            </p>

                            <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 divide-y divide-rose-200/60 dark:divide-rose-900/40">
                              {/* Delete team (owner) */}
                              {isOwner && (
                                <div className="flex items-center justify-between gap-4 px-5 py-4">
                                  <div>
                                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Delete this team</p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-xs">
                                      Permanently deletes the workspace, all hackathon tracking data, stage logs, and reflections. Cannot be undone.
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => { setDeleteConfirmInput(""); setShowDeleteConfirmModal(true); }}
                                    className="btn btn-danger shrink-0"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete team
                                  </button>
                                </div>
                              )}

                              {/* Leave team (member) */}
                              {!isOwner && (
                                <div className="flex items-center justify-between gap-4 px-5 py-4">
                                  <div>
                                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Leave this team</p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-xs">
                                      You will lose access to this workspace, its hackathon history, and all stage data. You can be re-invited later.
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => setShowLeaveModal(true)}
                                    className="btn shrink-0 border border-rose-200 bg-white text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 dark:bg-transparent dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white"
                                  >
                                    Leave team
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ── REMOVE MEMBER CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {removeMemberModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/65 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 shadow-2xl text-center"
            >
              <div className="mx-auto h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 mb-2">Remove member?</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-normal">
                <strong className="text-zinc-800 dark:text-zinc-200">{removeMemberModal.name}</strong> will lose access to this team workspace and all its data.
              </p>
              <div className="flex gap-2.5">
                <button onClick={() => setRemoveMemberModal(null)} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={handleRemoveMember} disabled={removeMemberLoading} className="btn btn-danger flex-1">
                  {removeMemberLoading ? <LogoTransition width={28} height={18} loop={true} /> : "Remove"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── LEAVE TEAM CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {showLeaveModal && selectedTeam && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/65 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 shadow-2xl text-center"
            >
              <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 mb-2">Leave "{selectedTeam.name}"?</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-normal">
                You will lose access to this team's workspace, hackathon tracking history, and stage logs. You can only re-join if the owner sends a new invitation.
              </p>
              <div className="flex gap-2.5">
                <button onClick={() => setShowLeaveModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={handleLeaveTeam} disabled={leaveTeamLoading} className="btn btn-danger flex-1">
                  {leaveTeamLoading ? <LogoTransition width={28} height={18} loop={true} /> : "Leave team"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* CREATE TEAM MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/65 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Close */}
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute right-4 top-4 rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="text-lg font-black text-zinc-900 dark:text-white leading-none mb-4">Create Team</h3>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Team Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Team Name</label>
                  <input
                    value={createTeamName}
                    onChange={(event) => setCreateTeamName(event.target.value)}
                    placeholder="Team Horizon"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2 text-sm text-zinc-800 outline-none transition focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                  />
                </div>

                {/* Teammates GitHub Search */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Teammate Search (GitHub ID)</label>
                  <div className="flex gap-2">
                    <input
                      value={githubSearchText}
                      onChange={(event) => setGithubSearchText(event.target.value)}
                      placeholder="e.g. octocat"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleGithubSearch();
                      }}
                      className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2 text-sm text-zinc-800 outline-none transition focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                    />
                    <button
                      onClick={handleGithubSearch}
                      disabled={githubSearchLoading || !githubSearchText.trim()}
                      className="inline-flex h-9.5 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-800 px-4 text-xs font-semibold hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50"
                    >
                      {githubSearchLoading ? <LogoTransition width={28} height={18} loop={true} /> : <Github className="h-4.5 w-4.5 mr-1" />}
                      Search
                    </button>
                  </div>
                  {githubSearchError && <p className="text-xs text-rose-500 font-bold mt-1">{githubSearchError}</p>}
                </div>

                {/* GitHub Search Result Container */}
                {searchedGithubUser && (
                  <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-xs">
                    <img src={searchedGithubUser.avatar_url} className="h-10 w-10 rounded-xl" alt="avatar" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{searchedGithubUser.name || searchedGithubUser.login}</p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">@{searchedGithubUser.login} • {searchedGithubUser.public_repos} repos</p>
                    </div>
                    <button
                      onClick={handleAddGithubMember}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                )}

                {/* Added Roster Invite list */}
                {addedTeammates.length > 0 && (
                  <div className="space-y-2.5 mt-4">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Added Roster ({addedTeammates.length})</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {addedTeammates.map((member, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                          <img src={member.avatar_url} className="h-7 w-7 rounded-lg" alt="avatar" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">@{member.login}</p>
                          </div>
                          <input
                            type="email"
                            placeholder="Teammate's Email"
                            value={member.email || ""}
                            onChange={(e) => {
                              const next = [...addedTeammates];
                              next[idx].email = e.target.value;
                              setAddedTeammates(next);
                            }}
                            className="px-2 py-1 text-xs border border-zinc-200 dark:border-zinc-800 rounded-lg w-40 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 outline-none"
                            required
                          />
                          <button
                            onClick={() => {
                              setAddedTeammates(addedTeammates.filter((_, i) => i !== idx));
                            }}
                            className="text-zinc-400 hover:text-red-500 p-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex gap-2 justify-end mt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTeam}
                  disabled={savingTeam || !createTeamName.trim()}
                  className="btn btn-primary"
                >
                  {savingTeam ? <LogoTransition width={28} height={18} loop={true} /> : "Create Team"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* JOIN TEAM MODAL */}
      <AnimatePresence>
        {showJoinModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/65 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
            >
              {/* Close */}
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinTokenInput("");
                  setJoinError("");
                }}
                className="absolute right-4 top-4 btn btn-ghost p-1.5 w-auto h-auto"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="text-lg font-black text-zinc-900 dark:text-white leading-none mb-3">Join Team</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-normal">
                Enter the 6-character Join Code (e.g. 9D3F8A) or paste the invitation link you received.
              </p>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Join Code / Link</label>
                  <input
                    value={joinTokenInput}
                    onChange={(event) => setJoinTokenInput(event.target.value)}
                    placeholder="e.g. 9D3F8A or accept-invitation?token=..."
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                  />
                </div>

                {joinError && <p className="text-xs text-rose-500 font-bold leading-normal">{joinError}</p>}

                <div className="pt-2 flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowJoinModal(false);
                      setJoinTokenInput("");
                      setJoinError("");
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleJoinTeam}
                    disabled={savingTeam || !joinTokenInput.trim()}
                    className="btn btn-primary"
                  >
                    {savingTeam ? <LogoTransition width={28} height={18} loop={true} /> : "Join Team"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* DELETE TEAM CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDeleteConfirmModal && selectedTeam && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/65 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
            >
              {/* Close */}
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setDeleteConfirmInput("");
                }}
                className="absolute right-4 top-4 btn btn-ghost p-1.5 w-auto h-auto"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="text-lg font-black text-rose-600 dark:text-rose-450 leading-none mb-3">Delete Team Workspace?</h3>
              <p className="text-xs text-zinc-650 dark:text-zinc-400 mb-4 leading-normal">
                This action <strong className="text-rose-600 dark:text-rose-400 font-bold">CANNOT</strong> be undone. This will permanently delete the team <strong>{selectedTeam.name}</strong>, clear all user invitations, remove all member links, and erase all hackathon tracking stage histories.
              </p>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                    Please type <span className="font-mono text-zinc-800 dark:text-zinc-200 select-all font-bold">"{selectedTeam.name}"</span> to confirm:
                  </label>
                  <input
                    value={deleteConfirmInput}
                    onChange={(event) => setDeleteConfirmInput(event.target.value)}
                    placeholder={selectedTeam.name}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3.5 py-2 text-sm text-zinc-800 outline-none transition focus:border-red-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                  />
                </div>

                <div className="pt-2 flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowDeleteConfirmModal(false);
                      setDeleteConfirmInput("");
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteTeam}
                    disabled={savingTeam || deleteConfirmInput !== selectedTeam.name}
                    className="btn btn-danger"
                  >
                    {savingTeam ? <LogoTransition width={28} height={18} loop={true} /> : "Delete this team"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* UNTRACK HACKATHON CONFIRMATION MODAL */}
      <AnimatePresence>
        {showUntrackConfirmModal && participationToUntrack && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/65 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 text-center animate-fade-in"
            >
              <div className="mx-auto h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-455 mb-4 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-white mb-2">Untrack Hackathon?</h3>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 mb-6 leading-normal">
                Are you sure you want to stop tracking <strong className="text-zinc-800 dark:text-zinc-100 font-bold">"{participationToUntrack.title}"</strong>? This will permanently delete your timeline, stages, and reflections for this team's participation.
              </p>

              <div className="flex gap-2.5 pt-2 justify-end">
                <button
                  onClick={() => {
                    setShowUntrackConfirmModal(false);
                    setParticipationToUntrack(null);
                  }}
                  className="flex-1 rounded-xl border border-zinc-200 bg-white py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmUntrack}
                  disabled={isUntracking}
                  className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-500 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isUntracking ? "Untracking..." : "Untrack"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE STAGE CONFIRMATION MODAL */}
      <AnimatePresence>
        {stageToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/65 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 text-center"
            >
              <div className="mx-auto h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-455 mb-4 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-white mb-2">Delete Milestone Stage?</h3>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 mb-6 leading-normal">
                Are you sure you want to delete stage <strong className="text-zinc-800 dark:text-zinc-100 font-bold">"{stageToDelete.stageName}"</strong>? This will permanently erase this stage milestone and all associated reflection logs.
              </p>

              <div className="flex gap-2.5 pt-2 justify-end">
                <button
                  onClick={() => setStageToDelete(null)}
                  className="flex-1 rounded-xl border border-zinc-200 bg-white py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteStage}
                  disabled={isDeletingStage}
                  className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-500 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center min-h-[36px]"
                >
                  {isDeletingStage ? <LogoTransition width={28} height={18} loop={true} /> : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
