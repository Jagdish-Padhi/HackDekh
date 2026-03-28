import axiosInstance from '../utils/axiosInstance';
import type { Team, TeamInvitation, GeneratedInvitationLink } from '../types';

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

  createTeam: async (payload: { name: string; invites?: string[] }): Promise<Team> => {
    const response = await axiosInstance.post<ApiResponse<Team>>('/teams', payload);
    return unwrap(response);
  },

  updateTeam: async (teamId: string, payload: { name: string }): Promise<Team> => {
    const response = await axiosInstance.put<ApiResponse<Team>>(`/teams/${teamId}`, payload);
    return unwrap(response);
  },

  // Invitation link methods
  generateInvitationLink: async (teamId: string, email: string): Promise<GeneratedInvitationLink> => {
    const response = await axiosInstance.post<ApiResponse<GeneratedInvitationLink>>(
      `/teams/${teamId}/generate-invite-link`,
      { email }
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

  // Deprecated: old user ID-based methods (kept for backward compatibility)
  addInvites: async (teamId: string, userIds: string[]): Promise<Team> => {
    const response = await axiosInstance.post<ApiResponse<Team>>(`/teams/${teamId}/invites`, { userIds });
    return unwrap(response);
  },

  removeInvite: async (teamId: string, userId: string): Promise<Team> => {
    const response = await axiosInstance.delete<ApiResponse<Team>>(`/teams/${teamId}/invites/${userId}`);
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
