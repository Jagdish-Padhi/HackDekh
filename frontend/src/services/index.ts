import axiosInstance from '../utils/axiosInstance';
import type {
  Team,
  TeamInvitation,
  GeneratedInvitationLink,
  InvitationPreview,
  TeamHackathon,
  Stage,
} from '../types';

interface ApiResponse<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

const unwrap = <T>(response: { data: ApiResponse<T> }): T => response.data.data;

export const teamApi = {
  getUserTeams: async (): Promise<Team[]> => {
    const response = await axiosInstance.get<ApiResponse<Team[]>>('/teams');
    return unwrap(response);
  },

  getTeamById: async (teamId: string): Promise<Team> => {
    const response = await axiosInstance.get<ApiResponse<Team>>(`/teams/${teamId}`);
    return unwrap(response);
  },

  createTeam: async (payload: { name: string }): Promise<Team> => {
    const response = await axiosInstance.post<ApiResponse<Team>>('/teams', payload);
    return unwrap(response);
  },

  updateTeam: async (teamId: string, payload: { name: string }): Promise<Team> => {
    const response = await axiosInstance.put<ApiResponse<Team>>(`/teams/${teamId}`, payload);
    return unwrap(response);
  },

  linkHackathon: async (
    teamId: string,
    hackathonId: string,
    firstStage?: { name: string; deadline?: string }
  ): Promise<TeamHackathon> => {
    const response = await axiosInstance.post<ApiResponse<TeamHackathon>>(`/teams/${teamId}/hackathons`, {
      hackathonId,
      firstStage,
    });
    return unwrap(response);
  },

  getTeamHackathons: async (teamId: string): Promise<TeamHackathon[]> => {
    const response = await axiosInstance.get<ApiResponse<TeamHackathon[]>>(`/teams/${teamId}/hackathons`);
    return unwrap(response);
  },

  updateStatus: async (teamId: string, thId: string, status: TeamHackathon['status']): Promise<TeamHackathon> => {
    const response = await axiosInstance.patch<ApiResponse<TeamHackathon>>(`/teams/${teamId}/hackathons/${thId}/status`, {
      status,
    });
    return unwrap(response);
  },

  addStage: async (
    teamId: string,
    thId: string,
    payload: { name: string; deadline?: string }
  ): Promise<Stage> => {
    const response = await axiosInstance.post<ApiResponse<Stage>>(`/teams/${teamId}/hackathons/${thId}/stages`, payload);
    return unwrap(response);
  },

  updateStage: async (
    teamId: string,
    thId: string,
    stageId: string,
    payload: { name?: string; deadline?: string | null; result?: Stage['result']; notes?: string }
  ): Promise<Stage> => {
    const response = await axiosInstance.put<ApiResponse<Stage>>(`/teams/${teamId}/hackathons/${thId}/stages/${stageId}`, payload);
    return unwrap(response);
  },

  deleteStage: async (teamId: string, thId: string, stageId: string): Promise<{ stageId: string }> => {
    const response = await axiosInstance.delete<ApiResponse<{ stageId: string }>>(`/teams/${teamId}/hackathons/${thId}/stages/${stageId}`);
    return unwrap(response);
  },

  addReflection: async (
    teamId: string,
    thId: string,
    stageId: string,
    note: string
  ): Promise<Stage> => {
    const response = await axiosInstance.post<ApiResponse<Stage>>(
      `/teams/${teamId}/hackathons/${thId}/stages/${stageId}/reflections`,
      { note }
    );
    return unwrap(response);
  },

  // Invitation link methods
  generateInvitationLink: async (teamId: string, email: string): Promise<GeneratedInvitationLink> => {
    const response = await axiosInstance.post<ApiResponse<GeneratedInvitationLink>>(
      `/teams/${teamId}/generate-invite-link`,
      { email },
      { timeout: 20000 }
    );
    return unwrap(response);
  },

  getTeamInvitations: async (teamId: string): Promise<TeamInvitation[]> => {
    const response = await axiosInstance.get<ApiResponse<TeamInvitation[]>>(
      `/teams/${teamId}/invites`
    );
    return unwrap(response);
  },

  acceptInvitationLink: async (token: string): Promise<Team> => {
    const response = await axiosInstance.post<ApiResponse<Team>>(
      '/teams/invitations/accept',
      { token }
    );
    return unwrap(response);
  },

  getInvitationPreview: async (token: string): Promise<InvitationPreview> => {
    const response = await axiosInstance.get<ApiResponse<InvitationPreview>>('/teams/invitations/preview', {
      params: { token },
    });
    return unwrap(response);
  },

  addMembers: async (teamId: string, userIds: string[]): Promise<Team> => {
    const response = await axiosInstance.post<ApiResponse<Team>>(`/teams/${teamId}/members`, { userIds });
    return unwrap(response);
  },

  removeMember: async (teamId: string, userId: string): Promise<Team> => {
    const response = await axiosInstance.delete<ApiResponse<Team>>(`/teams/${teamId}/members/${userId}`);
    return unwrap(response);
  },
};

export const userApi = {
  getPendingReflections: async (): Promise<Stage[]> => {
    const response = await axiosInstance.get<ApiResponse<Stage[]>>('/users/pending-reflections');
    return unwrap(response);
  },
};
