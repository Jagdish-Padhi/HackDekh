import type { Request, Response } from 'express';
import type { Types } from 'mongoose';
import * as teamService from '../services/team.service.ts';
import { ApiResponse } from '../utils/apiResponse.ts';
import { ApiError } from '../utils/apiError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { sendTeamInvitationEmail } from '../utils/email.ts';

interface CreateTeamRequestBody {
    name: string;
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

interface AcceptInvitationBody {
    token: string;
}

interface AuthRequest extends Request {
    user: { _id: Types.ObjectId };
    body: CreateTeamRequestBody;
}

export const createTeam = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json(new ApiResponse(400, null, 'Team name is required'));
    }
    
    try {
        const team = await teamService.createTeam({ name }, req.user._id);
        return res.status(201).json(new ApiResponse(201, team, "Team Created Successfully"));
    } catch (error: any) {
        if (error.statusCode === 409 && error.existingTeamId) {
            return res.status(409).json({
                success: false,
                message: error.message,
                existingTeamId: error.existingTeamId
            });
        }
        throw error;
    }
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

    // Derive frontend base URL from the request's Origin header (most reliable),
    // then Referer, then FRONTEND_URL env var, then localhost fallback.
    // This ensures the link in the email always points to wherever the user is browsing.
    const frontendBaseUrl = (() => {
        const origin = req.headers.origin;
        if (origin && !origin.startsWith('null')) return origin.replace(/\/$/, '');

        const referer = req.headers.referer;
        if (referer) {
            try {
                const { origin: refOrigin } = new URL(referer);
                if (refOrigin && refOrigin !== 'null') return refOrigin.replace(/\/$/, '');
            } catch { /* ignore malformed referer */ }
        }

        return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    })();

    const result = await teamService.generateInvitationLink(
        req.params.id,
        req.user._id,
        email.trim(),
        frontendBaseUrl
    );

    if (!result) {
        throw new ApiError(404, 'Team not found or unauthorized');
    }

    const owner = (result as { team?: { owner?: { fullName?: string; username?: string } } }).team?.owner;
    const ownerName = owner?.fullName || owner?.username || 'Team owner';
    let emailSent = true;

    try {
        await sendTeamInvitationEmail({
            to: result.invitedEmail,
            invitationLink: result.invitationLink,
            teamName: result.team?.name || 'your team',
            ownerName,
            expiresAt: result.expiresAt,
        });
    } catch (emailError) {
        emailSent = false;
        console.error('Team invitation email delivery failed:', emailError);
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            { ...result, emailSent },
            emailSent
                ? 'Invitation link generated and email sent successfully'
                : 'Invitation link generated, but email could not be sent. Please share the link manually.'
        )
    );
});

export const getInvitationPreview = asyncHandler(async (
    req: Request,
    res: Response
) => {
    const token = String(req.query.token || '');
    const preview = await teamService.getInvitationPreview(token);

    if (!preview) {
        throw new ApiError(404, 'Invitation not found');
    }

    return res.status(200).json(new ApiResponse(200, preview, 'Invitation preview fetched successfully'));
});

export const acceptInvitationLink = asyncHandler(async (
    req: Request<unknown, unknown, AcceptInvitationBody> & { user?: { _id: Types.ObjectId; email: string } },
    res: Response
) => {
    const { token } = req.body;
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

export const deleteTeam = asyncHandler(async (
    req: AuthRequest & Request<TeamIdParams>,
    res: Response
) => {
    const deletedTeam = await teamService.deleteTeam(req.params.id, req.user._id);
    if (!deletedTeam) {
        return res.status(404).json(new ApiResponse(404, null, 'Team not found or unauthorized to delete'));
    }

    return res.status(200).json(new ApiResponse(200, deletedTeam, 'Team deleted successfully'));
});

interface RegenerateCodeParams {
    id: string;
}

interface InviteUserBody {
    userIdOrUsername: string;
}

interface RespondInvitationParams {
    invitationId: string;
}

interface RespondInvitationBody {
    action: 'accept' | 'decline';
}

export const regenerateTeamCode = asyncHandler(async (req: any, res: Response) => {
    const updatedTeam = await teamService.regenerateTeamCode(req.params.id, req.user._id);
    if (!updatedTeam) {
        return res.status(404).json(new ApiResponse(404, null, 'Team not found or unauthorized'));
    }
    return res.status(200).json(new ApiResponse(200, updatedTeam, 'Team join code regenerated successfully'));
});

export const joinTeamByCode = asyncHandler(async (req: any, res: Response) => {
    const { code } = req.body;
    if (!code || typeof code !== 'string' || !code.trim()) {
        return res.status(400).json(new ApiResponse(400, null, 'Valid join code is required'));
    }

    try {
        const team = await teamService.joinTeamByCode(req.user._id, code.trim());
        return res.status(200).json(new ApiResponse(200, team, 'Successfully joined team'));
    } catch (error: any) {
        return res.status(400).json(new ApiResponse(400, null, error.message || 'Failed to join team'));
    }
});

export const inviteUserByUsernameOrId = asyncHandler(async (
    req: any,
    res: Response
) => {
    const { userIdOrUsername } = req.body;
    if (!userIdOrUsername || typeof userIdOrUsername !== 'string' || !userIdOrUsername.trim()) {
        return res.status(400).json(new ApiResponse(400, null, 'User ID or Username is required'));
    }

    try {
        const invitation = await teamService.inviteUserByUsernameOrId(
            req.params.id,
            req.user._id,
            userIdOrUsername.trim()
        );
        return res.status(201).json(new ApiResponse(201, invitation, 'Direct invitation sent successfully'));
    } catch (error: any) {
        return res.status(400).json(new ApiResponse(400, null, error.message || 'Failed to send invitation'));
    }
});

export const getUserInvitations = asyncHandler(async (req: any, res: Response) => {
    const invitations = await teamService.getUserInvitations(req.user._id);
    return res.status(200).json(new ApiResponse(200, invitations, 'User invitations fetched successfully'));
});

export const respondToInvitation = asyncHandler(async (
    req: any,
    res: Response
) => {
    const { action } = req.body;
    if (!action || !['accept', 'decline'].includes(action)) {
        return res.status(400).json(new ApiResponse(400, null, 'Valid action (accept or decline) is required'));
    }

    try {
        const result = await teamService.respondToInvitation(
            req.params.invitationId,
            req.user._id,
            action
        );
        return res.status(200).json(new ApiResponse(200, result, `Invitation ${action}ed successfully`));
    } catch (error: any) {
        return res.status(400).json(new ApiResponse(400, null, error.message || 'Failed to respond to invitation'));
    }
});

