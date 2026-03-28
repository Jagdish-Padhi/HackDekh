import axiosInstance from '../utils/axiosInstance';
import type { ApiResponseEnvelope, Team } from '../types';

const unwrap = <T>(response: { data: ApiResponseEnvelope<T> }): T => response.data.data;

export const teamApi = {
	getUserTeams: async (): Promise<Team[]> => {
		const response = await axiosInstance.get<ApiResponseEnvelope<Team[]>>('/teams');
		return unwrap(response);
	},

	getTeamById: async (teamId: string): Promise<Team> => {
		const response = await axiosInstance.get<ApiResponseEnvelope<Team>>(`/teams/${teamId}`);
		return unwrap(response);
	},

	createTeam: async (payload: { name: string; invites?: string[] }): Promise<Team> => {
		const response = await axiosInstance.post<ApiResponseEnvelope<Team>>('/teams', payload);
		return unwrap(response);
	},

	updateTeam: async (teamId: string, payload: { name: string }): Promise<Team> => {
		const response = await axiosInstance.put<ApiResponseEnvelope<Team>>(`/teams/${teamId}`, payload);
		return unwrap(response);
	},

	addInvites: async (teamId: string, userIds: string[]): Promise<Team> => {
		const response = await axiosInstance.post<ApiResponseEnvelope<Team>>(`/teams/${teamId}/invites`, { userIds });
		return unwrap(response);
	},

	removeInvite: async (teamId: string, userId: string): Promise<Team> => {
		const response = await axiosInstance.delete<ApiResponseEnvelope<Team>>(`/teams/${teamId}/invites/${userId}`);
		return unwrap(response);
	},

	addMembers: async (teamId: string, userIds: string[]): Promise<Team> => {
		const response = await axiosInstance.post<ApiResponseEnvelope<Team>>(`/teams/${teamId}/members`, { userIds });
		return unwrap(response);
	},

	removeMember: async (teamId: string, userId: string): Promise<Team> => {
		const response = await axiosInstance.delete<ApiResponseEnvelope<Team>>(`/teams/${teamId}/members/${userId}`);
		return unwrap(response);
	},
};
