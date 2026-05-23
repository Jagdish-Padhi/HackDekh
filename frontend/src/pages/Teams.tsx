import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Copy,
  ExternalLink,
  Loader2,
  Plus,
  Save,
  Settings,
  Shield,
  Trash2,
  Users,
  CalendarRange,
  Flag,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { teamApi } from "../services";
import type { GeneratedInvitationLink, Team, TeamHackathon, Stage } from "../types";

const teamTabs = ["Members", "Hackathons", "Stages", "Settings"] as const;

type WorkspaceTab = (typeof teamTabs)[number];

type TeamParticipation = TeamHackathon & { teamInfo: Team };

const formatDate = (value?: string | null) => {
  if (!value) return "TBD";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "TBD";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const stageResultClass = (result: Stage["result"]) => {
  if (/qualified/i.test(result)) return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (/rejected/i.test(result)) return "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400";
  return "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300";
};

export default function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("Members");
  const [teamParticipations, setTeamParticipations] = useState<TeamParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTeamData, setLoadingTeamData] = useState(false);
  const [createTeamName, setCreateTeamName] = useState("");
  const [renameTeamName, setRenameTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<GeneratedInvitationLink | null>(null);
  const [savingTeam, setSavingTeam] = useState(false);
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [newStageDraft, setNewStageDraft] = useState<Record<string, { name: string; deadline: string }>>({});
  const [selectedParticipationId, setSelectedParticipationId] = useState<string>("");
  const [stageSaving, setStageSaving] = useState<Record<string, "saved" | "saving" | "error">>({});

  const selectedTeam = useMemo(() => teams.find((team) => team._id === selectedTeamId) || null, [teams, selectedTeamId]);
  const selectedParticipation = useMemo(
    () => teamParticipations.find((participation) => participation._id === selectedParticipationId) || null,
    [teamParticipations, selectedParticipationId]
  );

  const loadTeams = async () => {
    setLoading(true);
    try {
      const data = await teamApi.getUserTeams();
      setTeams(data);
      setSelectedTeamId((current) => current || data[0]?._id || "");
    } catch (error) {
      console.error("Failed to load teams", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamWorkspace = async (teamId: string) => {
    if (!teamId) return;
    setLoadingTeamData(true);
    try {
      const participations = await teamApi.getTeamHackathons(teamId);
      const team = teams.find((candidate) => candidate._id === teamId);
      if (team) {
        setTeamParticipations(participations.map((participation) => ({ ...participation, teamInfo: team })));
      } else {
        setTeamParticipations([]);
      }
    } catch (error) {
      console.error("Failed to load team workspace", error);
      setTeamParticipations([]);
    } finally {
      setLoadingTeamData(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (!selectedTeamId && teams.length > 0) {
      setSelectedTeamId(teams[0]._id);
    }
  }, [teams, selectedTeamId]);

  useEffect(() => {
    if (selectedTeamId) {
      loadTeamWorkspace(selectedTeamId);
      setSelectedParticipationId("");
      setInviteLink(null);
      setWorkspaceMessage(null);
    }
  }, [selectedTeamId]);

  useEffect(() => {
    if (!selectedParticipationId && teamParticipations.length > 0) {
      setSelectedParticipationId(teamParticipations[0]._id);
    }
  }, [teamParticipations, selectedParticipationId]);

  const createTeam = async () => {
    if (!createTeamName.trim()) return;
    setSavingTeam(true);
    setWorkspaceMessage(null);
    try {
      const created = await teamApi.createTeam({ name: createTeamName.trim() });
      setTeams((current) => [created, ...current]);
      setSelectedTeamId(created._id);
      setCreateTeamName("");
      setWorkspaceMessage(`Created ${created.name}`);
    } catch (error: any) {
      console.error("Failed to create team", error);
      setWorkspaceMessage(error.response?.data?.message || "Failed to create team.");
    } finally {
      setSavingTeam(false);
    }
  };

  const handleRenameTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTeam || !renameTeamName.trim()) return;
    setSavingTeam(true);
    try {
      const updated = await teamApi.updateTeam(selectedTeam._id, { name: renameTeamName.trim() });
      setTeams((current) => current.map((team) => (team._id === updated._id ? updated : team)));
      setWorkspaceMessage("Team renamed successfully.");
    } catch (error: any) {
      console.error("Failed to rename team", error);
      setWorkspaceMessage(error.response?.data?.message || "Failed to rename team.");
    } finally {
      setSavingTeam(false);
    }
  };

  const handleInvite = async () => {
    if (!selectedTeam || !inviteEmail.trim()) return;
    setSavingTeam(true);
    setWorkspaceMessage(null);
    try {
      const link = await teamApi.generateInvitationLink(selectedTeam._id, inviteEmail.trim());
      setInviteLink(link);
      setInviteEmail("");
      setWorkspaceMessage("Invitation link generated.");
    } catch (error: any) {
      console.error("Failed to generate invite link", error);
      setWorkspaceMessage(error.response?.data?.message || "Failed to generate invitation link.");
    } finally {
      setSavingTeam(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteLink?.invitationLink) return;
    await navigator.clipboard.writeText(inviteLink.invitationLink);
    setWorkspaceMessage("Invitation link copied to clipboard.");
  };

  const handleAddStage = async (participationId: string) => {
    const draft = newStageDraft[participationId];
    if (!draft?.name?.trim()) return;

    const participation = teamParticipations.find((item) => item._id === participationId);
    if (!participation) return;

    try {
      const createdStage = await teamApi.addStage(participation.teamInfo._id, participationId, {
        name: draft.name.trim(),
        deadline: draft.deadline || undefined,
      });
      setTeamParticipations((current) =>
        current.map((item) => (item._id === participationId ? { ...item, stages: [...item.stages, createdStage] } : item))
      );
      setNewStageDraft((current) => ({ ...current, [participationId]: { name: "", deadline: "" } }));
    } catch (error) {
      console.error("Failed to add stage", error);
    }
  };

  const handleUpdateStage = async (participationId: string, stageId: string, payload: { name?: string; deadline?: string | null; result?: Stage["result"] }) => {
    const participation = teamParticipations.find((item) => item._id === participationId);
    if (!participation) return;

    setStageSaving((current) => ({ ...current, [stageId]: "saving" }));
    try {
      const updatedStage = await teamApi.updateStage(participation.teamInfo._id, participationId, stageId, payload);
      setTeamParticipations((current) =>
        current.map((item) => ({
          ...item,
          stages: item._id === participationId ? item.stages.map((stage) => (stage._id === stageId ? { ...stage, ...updatedStage } : stage)) : item.stages,
        }))
      );
      setStageSaving((current) => ({ ...current, [stageId]: "saved" }));
    } catch (error) {
      console.error("Failed to update stage", error);
      setStageSaving((current) => ({ ...current, [stageId]: "error" }));
    }
  };

  const handleDeleteStage = async (participationId: string, stageId: string) => {
    const participation = teamParticipations.find((item) => item._id === participationId);
    if (!participation) return;

    if (!window.confirm("Delete this stage?")) return;

    try {
      await teamApi.deleteStage(participation.teamInfo._id, participationId, stageId);
      setTeamParticipations((current) =>
        current.map((item) => (item._id === participationId ? { ...item, stages: item.stages.filter((stage) => stage._id !== stageId) } : item))
      );
    } catch (error) {
      console.error("Failed to delete stage", error);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center px-4 py-10">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">Loading teams...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Team Collaboration</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">Teams workspace</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Create teams, manage invitations, and keep hackathon stages in one place.
          </p>
        </div>
        <Link
          to="/dashboard?tab=tracker"
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          Open Dashboard
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4 rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70">
          <div className="space-y-3 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Create new team</label>
            <input
              value={createTeamName}
              onChange={(event) => setCreateTeamName(event.target.value)}
              placeholder="Team Aurora"
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 outline-none transition focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
            />
            <button
              onClick={createTeam}
              disabled={savingTeam || !createTeamName.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingTeam ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Team
            </button>
          </div>

          <div className="space-y-2">
            {teams.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-400">
                No teams yet. Create your first team to start collaborating.
              </div>
            ) : (
              teams.map((team) => {
                const isActive = team._id === selectedTeamId;
                return (
                  <button
                    key={team._id}
                    onClick={() => setSelectedTeamId(team._id)}
                    className={`w-full rounded-[1.5rem] border p-4 text-left transition ${
                      isActive
                        ? "border-blue-500/40 bg-blue-500/5 ring-2 ring-blue-500/15"
                        : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{team.name}</h2>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{team.members.length} members</p>
                      </div>
                      <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2 py-1 text-[0.65rem] font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                        {team.owner._id === user?._id ? "Owner" : "Member"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="space-y-5 rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70 md:p-6">
          {!selectedTeam ? (
            <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center dark:border-zinc-800 dark:bg-zinc-950/30">
              <Users className="mx-auto h-12 w-12 text-zinc-400" />
              <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">Select a team</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Pick a team from the left panel to manage members and hackathon workspaces.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Workspace</p>
                  <h2 className="mt-1 text-2xl font-black text-zinc-900 dark:text-zinc-100">{selectedTeam.name}</h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Owner: {selectedTeam.owner.fullName || selectedTeam.owner.username || selectedTeam.owner.email}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {teamTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        activeTab === tab
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {workspaceMessage && (
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
                  {workspaceMessage}
                </div>
              )}

              {activeTab === "Members" && (
                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                  <div className="space-y-3 rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">Members</h3>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{selectedTeam.members.length} total</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedTeam.members.map((member) => (
                        <div key={member._id} className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-sm font-bold text-blue-700 dark:text-blue-400">
                            {(member.fullName || member.username || "U").slice(0, 2).toUpperCase()}
                          </div>
                          <p className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{member.fullName || member.username || member.email}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{member.email}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">Invite teammate</h3>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Generate an invite link for a teammate by email.</p>
                    </div>
                    <input
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      type="email"
                      placeholder="teammate@example.com"
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 outline-none transition focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                    />
                    <button
                      onClick={handleInvite}
                      disabled={savingTeam || !inviteEmail.trim()}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingTeam ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                      Generate invite link
                    </button>

                    {inviteLink && (
                      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Invite link</p>
                          <p className="mt-1 break-all text-sm text-zinc-700 dark:text-zinc-300">{inviteLink.invitationLink}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleCopyInvite}
                            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </button>
                          <a
                            href={inviteLink.invitationLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
                          >
                            Open
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "Hackathons" && (
                <div className="space-y-3">
                  {loadingTeamData ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading hackathons...
                    </div>
                  ) : teamParticipations.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center dark:border-zinc-800 dark:bg-zinc-950/30">
                      <Flag className="mx-auto h-10 w-10 text-zinc-400" />
                      <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">No participations yet</h3>
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Register this team on a hackathon details page to start tracking it here.</p>
                    </div>
                  ) : (
                    teamParticipations.map((participation) => (
                      <div key={participation._id} className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{participation.hackathon.title}</h3>
                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{participation.hackathon.platform}</p>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${stageResultClass(participation.status)}`}>
                            {participation.status}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 dark:border-zinc-800 dark:bg-zinc-950">{participation.stages.length} stages</span>
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 dark:border-zinc-800 dark:bg-zinc-950">Updated {formatDate(participation.updatedAt)}</span>
                          <Link to="/dashboard?tab=tracker" className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-white">
                            Dashboard
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "Stages" && (
                <div className="space-y-4">
                  {loadingTeamData ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading stages...
                    </div>
                  ) : selectedParticipation ? (
                    <>
                      <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">Selected participation</h3>
                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{selectedParticipation.hackathon.title}</p>
                          </div>
                          <select
                            value={selectedParticipationId}
                            onChange={(event) => setSelectedParticipationId(event.target.value)}
                            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                          >
                            {teamParticipations.map((participation) => (
                              <option key={participation._id} value={participation._id}>
                                {participation.hackathon.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {selectedParticipation.stages.length === 0 ? (
                          <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-950/30">
                            <CalendarRange className="mx-auto h-10 w-10 text-zinc-400" />
                            <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">No stages yet</h3>
                            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Add the first stage for this hackathon participation.</p>
                          </div>
                        ) : (
                          selectedParticipation.stages.map((stage) => (
                            <div key={stage._id} className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                              <div className="flex items-start justify-between gap-3">
                                <input
                                  defaultValue={stage.name}
                                  onBlur={(event) => {
                                    if (event.target.value !== stage.name) {
                                      handleUpdateStage(selectedParticipation._id, stage._id, { name: event.target.value });
                                    }
                                  }}
                                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-900 outline-none transition focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                                />
                                <button
                                  onClick={() => handleDeleteStage(selectedParticipation._id, stage._id)}
                                  className="rounded-lg p-2 text-zinc-400 transition hover:bg-rose-500/10 hover:text-rose-500"
                                  title="Delete stage"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <input
                                  type="date"
                                  defaultValue={stage.deadline ? new Date(stage.deadline).toISOString().slice(0, 10) : ""}
                                  onBlur={(event) => {
                                    const nextDeadline = event.target.value || null;
                                    const currentDeadline = stage.deadline ? new Date(stage.deadline).toISOString().slice(0, 10) : "";
                                    if (nextDeadline !== currentDeadline) {
                                      handleUpdateStage(selectedParticipation._id, stage._id, { deadline: nextDeadline });
                                    }
                                  }}
                                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                                />
                                <button
                                  onClick={() => {
                                    const resultOrder: Stage["result"][] = ["pending", "qualified", "rejected"];
                                    const currentIndex = resultOrder.indexOf(stage.result as Stage["result"]);
                                    const nextResult = resultOrder[(currentIndex + 1) % resultOrder.length];
                                    handleUpdateStage(selectedParticipation._id, stage._id, { result: nextResult });
                                  }}
                                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${stageResultClass(stage.result)}`}
                                >
                                  {stage.result}
                                </button>
                                {stageSaving[stage._id] && (
                                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                    {stageSaving[stage._id] === "saving" ? "Saving..." : stageSaving[stage._id] === "saved" ? "Saved" : "Error"}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">Add stage</h3>
                        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_220px]">
                          <input
                            value={newStageDraft[selectedParticipation._id]?.name || ""}
                            onChange={(event) =>
                              setNewStageDraft((current) => ({
                                ...current,
                                [selectedParticipation._id]: {
                                  name: event.target.value,
                                  deadline: current[selectedParticipation._id]?.deadline || "",
                                },
                              }))
                            }
                            placeholder="Stage name"
                            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                          />
                          <input
                            type="date"
                            value={newStageDraft[selectedParticipation._id]?.deadline || ""}
                            onChange={(event) =>
                              setNewStageDraft((current) => ({
                                ...current,
                                [selectedParticipation._id]: {
                                  name: current[selectedParticipation._id]?.name || "",
                                  deadline: event.target.value,
                                },
                              }))
                            }
                            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                          />
                        </div>
                        <button
                          onClick={() => handleAddStage(selectedParticipation._id)}
                          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                        >
                          <Plus className="h-4 w-4" />
                          Add stage
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-950/30">
                      <CalendarRange className="mx-auto h-10 w-10 text-zinc-400" />
                      <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">Select a participation</h3>
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Choose a hackathon from the Hackathons tab to manage its stages here.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Settings" && (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                    <div className="flex items-center gap-3">
                      <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">Rename team</h3>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Update the visible team name.</p>
                      </div>
                    </div>
                    <form onSubmit={handleRenameTeam} className="mt-4 space-y-3">
                      <input
                        value={renameTeamName}
                        onChange={(event) => setRenameTeamName(event.target.value)}
                        placeholder={selectedTeam.name}
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 outline-none transition focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                      />
                      <button
                        type="submit"
                        disabled={savingTeam || !renameTeamName.trim()}
                        className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingTeam ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save
                      </button>
                    </form>
                  </div>

                  <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                    <div className="flex items-center gap-3">
                      <ExternalLink className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">Quick access</h3>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Jump back to the tracker when you need to review participations.</p>
                      </div>
                    </div>
                    <Link
                      to="/dashboard?tab=tracker"
                      className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                    >
                      Open Dashboard tracker
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
