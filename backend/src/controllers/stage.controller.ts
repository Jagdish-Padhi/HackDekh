import type { Request, Response } from 'express';
import type { Types } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { ApiResponse } from '../utils/apiResponse.ts';
import { ApiError } from '../utils/apiError.ts';
import * as stageService from '../services/stage.service.ts';

interface AuthRequest extends Request {
    user: { _id: Types.ObjectId };
    params: Record<string, string>;
}

// POST /teams/:id/hackathons/:thId/stages
export const addStage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, deadline } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
        throw new ApiError(400, 'Stage name is required');
    }

    const isRegistrationStageName = (n: string) => /register|registration|apply|application|prep|regn/i.test(n);
    if (isRegistrationStageName(name)) {
        throw new ApiError(400, 'Registration is tracked automatically. Please add a competitive milestone (e.g. Ideation, Round 1).');
    }

    const exists = await stageService.stageExists(String(req.params.thId), name);
    if (exists) {
        throw new ApiError(400, 'Stage with this name already exists');
    }

    const stage = await stageService.addStage(String(req.params.thId), req.user._id, {
        name,
        deadline,
    });

    if (!stage) {
        throw new ApiError(404, 'Participation not found or you are not a member');
    }

    return res.status(201).json(new ApiResponse(201, stage, 'Stage added successfully'));
});

// PUT /teams/:id/hackathons/:thId/stages/:stageId
export const updateStage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, deadline, result, notes } = req.body;

    if (name !== undefined) {
        if (typeof name !== 'string' || !name.trim()) {
            throw new ApiError(400, 'Stage name cannot be empty');
        }
        const isRegistrationStageName = (n: string) => /register|registration|apply|application|prep|regn/i.test(n);
        if (isRegistrationStageName(name)) {
            throw new ApiError(400, 'Registration is tracked automatically. Please use a competitive milestone name.');
        }
        const exists = await stageService.stageExists(String(req.params.thId), name, String(req.params.stageId));
        if (exists) {
            throw new ApiError(400, 'Stage with this name already exists');
        }
    }

    const stage = await stageService.updateStage(String(req.params.stageId), req.user._id, {
        name,
        deadline,
        result,
        notes,
    });

    if (!stage) {
        throw new ApiError(404, 'Stage not found or you are not a member');
    }

    return res.status(200).json(new ApiResponse(200, stage, 'Stage updated successfully'));
});

// DELETE /teams/:id/hackathons/:thId/stages/:stageId
export const deleteStage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const success = await stageService.deleteStage(String(req.params.stageId), req.user._id);

    if (!success) {
        throw new ApiError(404, 'Stage not found or you are not a member');
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { stageId: String(req.params.stageId) }, 'Stage deleted successfully'));
});

// POST /teams/:id/hackathons/:thId/stages/:stageId/reflections
export const addReflection = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { note } = req.body;

    if (!note || typeof note !== 'string' || !note.trim()) {
        throw new ApiError(400, 'Reflection note is required');
    }

    const stage = await stageService.addReflection(String(req.params.stageId), req.user._id, note.trim());

    if (!stage) {
        throw new ApiError(404, 'Stage not found or you are not a member');
    }

    return res.status(201).json(new ApiResponse(201, stage, 'Reflection saved successfully'));
});

// DELETE /teams/:id/hackathons/:thId/stages/:stageId/reflections
export const removeReflection = asyncHandler(async (req: AuthRequest, res: Response) => {
    const stage = await stageService.removeReflection(String(req.params.stageId), req.user._id);

    if (!stage) {
        throw new ApiError(404, 'Stage not found or you are not a member');
    }

    return res.status(200).json(new ApiResponse(200, stage, 'Reflection deleted successfully'));
});
