import { ObjectId } from 'mongoose';
import Team from '../models/team.model.ts';
import { ApiError } from '../utils/apiError.ts';

interface CreateTeamInput {
    name: string;
    invites?: string[] | undefined;
}

export async function createTeam(teamData: CreateTeamInput, ownerId: ObjectId) {

    const existing = await Team.findOne({ name: teamData.name, owner: ownerId });
    if (existing) throw new ApiError(409, 'Team name already exists for this user');

    const team = new Team({
        ...teamData,
        owner: ownerId,
        members: [ownerId], // owner is first member always
    });

    await team.save();
    return team;
}

export async function getUserTeams(userId: ObjectId) {
    return Team.find({ members: userId });
}