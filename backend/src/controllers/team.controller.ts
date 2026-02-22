import * as teamService from '../services/team.service.ts';
import { ApiResponse } from '../utils/apiResponse.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { Request, Response } from 'express';
import mongoose from 'mongoose';

interface CreateTeamRequestBody {
    name: string;
    invites?: string[];
}

interface AuthRequest extends Request {
    user: { _id: mongoose.Schema.Types.ObjectId };
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

