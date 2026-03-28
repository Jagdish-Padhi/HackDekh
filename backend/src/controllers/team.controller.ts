import type { Request, Response } from 'express';
import type { Types } from 'mongoose';
import * as teamService from '../services/team.service.ts';
import { ApiResponse } from '../utils/apiResponse.ts';
import { ApiError } from '../utils/apiError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';

interface CreateTeamRequestBody {
    name: string;
    invites?: string[];
}

interface UpdateTeamRequestBody {
    name: string;
}

interface UserIdListRequestBody {
    userIds: string[];
}

interface TeamIdParams {
    id: string;
}

interface TeamUserIdParams extends TeamIdParams {
    userId: string;
}

interface GenerateInviteLinkBody {
    email: string;
}

interface AuthRequest extends Request {
    user: { _id: Types.ObjectId };
    body: CreateTeamRequestBody;
}

export const createTeam = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, invites } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json(new ApiResponse(400, null, 'Team name is required'));
    }
    // Optionally: check for duplicate team name for this user here
    const team = await teamService.createTeam({ name, invites }, req.user._id);
    return res.status(201).json(new ApiResponse(201, team, "Team Created Successfully"));
});

export const getUserTeams = asyncHandler(async (req: AuthRequest, res: Response) => {
    const teams = await teamService.getUserTeams(req.user._id);
    return res.status(200).json(new ApiResponse(200, teams, "All teams fetched successfully!"));
});

export const getTeamById = asyncHandler(async (req: AuthRequest & Request<TeamIdParams>, res: Response) => {
    const team = await teamService.getTeamById(req.params.id, req.user._id);
    if (!team) {
        return res.status(404).json(new ApiResponse(404, null, 'Team not found'));
    }

    return res.status(200).json(new ApiResponse(200, team, 'Team fetched successfully'));
});

export const updateTeam = asyncHandler(async (
    req: AuthRequest & Request<TeamIdParams, unknown, UpdateTeamRequestBody>,
    res: Response
) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json(new ApiResponse(400, null, 'Team name is required'));
    }

    const updatedTeam = await teamService.updateTeamName(req.params.id, req.user._id, name);
    if (!updatedTeam) {
        return res.status(404).json(new ApiResponse(404, null, 'Team not found or unauthorized'));
    }

    return res.status(200).json(new ApiResponse(200, updatedTeam, 'Team updated successfully'));
});

export const addTeamInvites = asyncHandler(async (
    req: AuthRequest & Request<TeamIdParams, unknown, UserIdListRequestBody>,
    res: Response
) => {
    const userIds = Array.isArray(req.body.userIds) ? req.body.userIds : [];
    if (!userIds.length) {
        return res.status(400).json(new ApiResponse(400, null, 'At least one userId is required'));
    }

    const updatedTeam = await teamService.addInvites(req.params.id, req.user._id, userIds);
    if (!updatedTeam) {
        return res.status(404).json(new ApiResponse(404, null, 'Team not found or unauthorized'));
    }

    return res.status(200).json(new ApiResponse(200, updatedTeam, 'Invites added successfully'));
});

export const removeTeamInvite = asyncHandler(async (
    req: AuthRequest & Request<TeamUserIdParams>,
    res: Response
) => {
    const updatedTeam = await teamService.removeInvite(req.params.id, req.user._id, req.params.userId);
    if (!updatedTeam) {
        return res.status(404).json(new ApiResponse(404, null, 'Team not found, unauthorized, or invalid userId'));
    }

    return res.status(200).json(new ApiResponse(200, updatedTeam, 'Invite removed successfully'));
});

export const addTeamMembers = asyncHandler(async (
    req: AuthRequest & Request<TeamIdParams, unknown, UserIdListRequestBody>,
    res: Response
) => {
    const userIds = Array.isArray(req.body.userIds) ? req.body.userIds : [];
    if (!userIds.length) {
        return res.status(400).json(new ApiResponse(400, null, 'At least one userId is required'));
    }

    const updatedTeam = await teamService.addMembers(req.params.id, req.user._id, userIds);
    if (!updatedTeam) {
        return res.status(404).json(new ApiResponse(404, null, 'Team not found or unauthorized'));
    }

    return res.status(200).json(new ApiResponse(200, updatedTeam, 'Members added successfully'));
});

export const removeTeamMember = asyncHandler(async (
    req: AuthRequest & Request<TeamUserIdParams>,
    res: Response
) => {
    const updatedTeam = await teamService.removeMember(req.params.id, req.user._id, req.params.userId);
    if (!updatedTeam) {
        return res.status(404).json(new ApiResponse(404, null, 'Team not found, unauthorized, invalid userId, or owner removal blocked'));
    }

    return res.status(200).json(new ApiResponse(200, updatedTeam, 'Member removed successfully'));
});

export const generateInvitationLink = asyncHandler(async (
    req: AuthRequest & Request<TeamIdParams, unknown, GenerateInviteLinkBody>,
    res: Response
) => {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
        throw new ApiError(400, 'Valid email is required');
    }

    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const result = await teamService.generateInvitationLink(
        req.params.id,
        req.user._id,
        email.trim(),
        frontendBaseUrl
    );

    if (!result) {
        throw new ApiError(404, 'Team not found or unauthorized');
    }

    return res.status(200).json(new ApiResponse(200, result, 'Invitation link generated successfully'));
});

export const acceptInvitationLink = asyncHandler(async (
    req: Request & { user?: { _id: Types.ObjectId; email: string } },
    res: Response
) => {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
        throw new ApiError(400, 'Valid invitation token is required');
    }

    // Check if user is authenticated
    if (!req.user || !req.user._id) {
        throw new ApiError(401, 'Authentication required to accept invitation');
    }

    const team = await teamService.acceptInvitationLink(token, req.user._id, req.user.email);
    if (!team) {
        throw new ApiError(400, 'Invalid, expired, or already accepted invitation token');
    }

    return res.status(200).json(new ApiResponse(200, team, 'Invitation accepted successfully'));
});

export const getTeamInvitations = asyncHandler(async (
    req: AuthRequest & Request<TeamIdParams>,
    res: Response
) => {
    const invitations = await teamService.getTeamInvitations(req.params.id, req.user._id);
    if (invitations === null) {
        throw new ApiError(404, 'Team not found or unauthorized');
    }

    return res.status(200).json(new ApiResponse(200, invitations, 'Team invitations fetched successfully'));
});

