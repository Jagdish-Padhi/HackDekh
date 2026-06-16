import type { Request, Response } from 'express';
import type { Types } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { ApiResponse } from '../utils/apiResponse.ts';
import { ApiError } from '../utils/apiError.ts';
import * as thService from '../services/teamHackathon.service.ts';

interface AuthRequest extends Request {
    user: { _id: Types.ObjectId };
    params: Record<string, string>;
}

// POST /teams/:id/hackathons
export const linkTeamToHackathon = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { hackathonId, firstStage } = req.body;

    if (!hackathonId || typeof hackathonId !== 'string') {
        throw new ApiError(400, 'hackathonId is required');
    }

    const result = await thService.linkTeamToHackathon(
        String(req.params.id),
        hackathonId,
        req.user._id,
        firstStage
    );

    if ('error' in result && result.error) {
        throw new ApiError(400, result.error);
    }

    return res
        .status(201)
        .json(new ApiResponse(201, (result as any).participation, 'Team registered for hackathon successfully'));
});

// GET /teams/:id/hackathons
export const getTeamHackathons = asyncHandler(async (req: AuthRequest, res: Response) => {
    const participations = await thService.getTeamHackathons(String(req.params.id), req.user._id);

    if (participations === null) {
        throw new ApiError(404, 'Team not found or you are not a member');
    }

    return res
        .status(200)
        .json(new ApiResponse(200, participations, 'Team hackathons fetched successfully'));
});

// PATCH /teams/:id/hackathons/:thId/status
export const updateParticipationStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status } = req.body;
    const validStatuses = ['tracking', 'active', 'eliminated', 'finalist', 'won'];

    if (!status || !validStatuses.includes(status)) {
        throw new ApiError(400, `status must be one of: ${validStatuses.join(', ')}`);
    }

    try {
        const updated = await thService.updateParticipationStatus(
            String(req.params.thId),
            req.user._id,
            status
        );

        if (!updated) {
            throw new ApiError(404, 'Participation not found or you are not the team owner');
        }

        return res
            .status(200)
            .json(new ApiResponse(200, updated, 'Participation status updated'));
    } catch (error: any) {
        if (error.message === 'REVERSION_LOCKED') {
            throw new ApiError(400, 'Cannot revert registered hackathon back to tracking status');
        }
        throw error;
    }
});

// DELETE /teams/:id/hackathons/:hackathonId
export const unlinkTeamFromHackathon = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { hackathonId } = req.params;

    if (!hackathonId || typeof hackathonId !== 'string') {
        throw new ApiError(400, 'hackathonId is required');
    }

    const result = await thService.unlinkTeamFromHackathon(
        String(req.params.id),
        hackathonId,
        req.user._id
    );

    if ('error' in result && result.error) {
        throw new ApiError(400, result.error);
    }

    return res
        .status(200)
        .json(new ApiResponse(200, null, 'Hackathon untracked successfully'));
});

