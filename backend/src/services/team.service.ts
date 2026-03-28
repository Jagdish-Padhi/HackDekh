import { Types } from 'mongoose';
import Team from '../models/team.model.ts';
import User from '../models/user.model.ts';

interface CreateTeamInput {
    name: string;
    invites?: string[] | undefined;
}

function asObjectIdStrings(ids: string[]) {
    return [...new Set(ids.map((id) => id.trim()).filter((id) => Types.ObjectId.isValid(id)))];
}

function toObjectIds(ids: string[]): Types.ObjectId[] {
    return asObjectIdStrings(ids).map((id) => new Types.ObjectId(id));
}

async function keepExistingUsers(ids: string[]): Promise<Types.ObjectId[]> {
    const objectIds = toObjectIds(ids);
    if (!objectIds.length) {
        return [];
    }

    const existingUsers = await User.find({ _id: { $in: objectIds } }).select('_id').lean();
    return existingUsers.map((user) => new Types.ObjectId(String(user._id)));
}

function toIdString(value: unknown): string {
    if (value && typeof value === 'object' && '_id' in value) {
        return String((value as { _id: unknown })._id);
    }
    return String(value);
}

function includesUserId(list: unknown[], userId: Types.ObjectId): boolean {
    const target = String(userId);
    return list.some((item) => toIdString(item) === target);
}

export async function createTeam(teamData: CreateTeamInput, ownerId: Types.ObjectId) {
    const existingInvites = await keepExistingUsers(teamData.invites || []);
    const sanitizedInvites = existingInvites.filter((inviteId) => String(inviteId) !== String(ownerId));

    const team = new Team({
        name: teamData.name.trim(),
        invites: sanitizedInvites,
        owner: ownerId,
        members: [ownerId],
    });

    await team.save();
    return Team.findById(team._id)
        .populate('owner', 'username fullName email')
        .populate('members', 'username fullName email')
        .populate('invites', 'username fullName email');
}

export async function getUserTeams(userId: Types.ObjectId) {
    return Team.find({ members: userId })
        .populate('owner', 'username fullName email')
        .populate('members', 'username fullName email')
        .populate('invites', 'username fullName email')
        .sort({ createdAt: -1 });
}

export async function getTeamById(teamId: string, userId: Types.ObjectId) {
    if (!Types.ObjectId.isValid(teamId)) {
        return null;
    }

    const team = await Team.findById(teamId)
        .populate('owner', 'username fullName email')
        .populate('members', 'username fullName email')
        .populate('invites', 'username fullName email');

    if (!team) {
        return null;
    }

    const isMember = includesUserId(team.members as unknown[], userId);
    const isOwner = toIdString(team.owner) === String(userId);

    if (!isMember && !isOwner) {
        return null;
    }

    return team;
}

export async function updateTeamName(teamId: string, ownerId: Types.ObjectId, name: string) {
    if (!Types.ObjectId.isValid(teamId)) {
        return null;
    }

    const updatedTeam = await Team.findOneAndUpdate(
        { _id: teamId, owner: ownerId },
        { $set: { name: name.trim() } },
        { new: true }
    )
        .populate('owner', 'username fullName email')
        .populate('members', 'username fullName email')
        .populate('invites', 'username fullName email');

    return updatedTeam;
}

export async function addInvites(teamId: string, ownerId: Types.ObjectId, inviteIds: string[]) {
    if (!Types.ObjectId.isValid(teamId)) {
        return null;
    }

    const team = await Team.findOne({ _id: teamId, owner: ownerId });
    if (!team) {
        return null;
    }

    const validInvites = await keepExistingUsers(inviteIds);
    const memberIds = (team.members as unknown[]).map((id) => toIdString(id));
    const ownerAsString = String(ownerId);

    const newInviteIds = validInvites
        .map((id) => String(id))
        .filter((id) => id !== ownerAsString && !memberIds.includes(id));

    if (newInviteIds.length) {
        await Team.updateOne(
            { _id: team._id },
            { $addToSet: { invites: { $each: newInviteIds.map((id) => new Types.ObjectId(id)) } } }
        );
    }

    return Team.findById(team._id)
        .populate('owner', 'username fullName email')
        .populate('members', 'username fullName email')
        .populate('invites', 'username fullName email');
}

export async function removeInvite(teamId: string, ownerId: Types.ObjectId, userId: string) {
    if (!Types.ObjectId.isValid(teamId) || !Types.ObjectId.isValid(userId)) {
        return null;
    }

    const updatedTeam = await Team.findOneAndUpdate(
        { _id: teamId, owner: ownerId },
        { $pull: { invites: new Types.ObjectId(userId) } },
        { new: true }
    )
        .populate('owner', 'username fullName email')
        .populate('members', 'username fullName email')
        .populate('invites', 'username fullName email');

    return updatedTeam;
}

export async function addMembers(teamId: string, ownerId: Types.ObjectId, memberIds: string[]) {
    if (!Types.ObjectId.isValid(teamId)) {
        return null;
    }

    const team = await Team.findOne({ _id: teamId, owner: ownerId });
    if (!team) {
        return null;
    }

    const validMembers = await keepExistingUsers(memberIds);
    const ownerAsString = String(ownerId);

    const newMemberIds = validMembers
        .map((id) => String(id))
        .filter((id) => id !== ownerAsString);

    if (newMemberIds.length) {
        await Team.updateOne(
            { _id: team._id },
            {
                $addToSet: { members: { $each: newMemberIds.map((id) => new Types.ObjectId(id)) } },
                $pull: { invites: { $in: newMemberIds.map((id) => new Types.ObjectId(id)) } },
            }
        );
    }

    return Team.findById(team._id)
        .populate('owner', 'username fullName email')
        .populate('members', 'username fullName email')
        .populate('invites', 'username fullName email');
}

export async function removeMember(teamId: string, ownerId: Types.ObjectId, memberId: string) {
    if (!Types.ObjectId.isValid(teamId) || !Types.ObjectId.isValid(memberId)) {
        return null;
    }

    if (String(ownerId) === memberId) {
        return null;
    }

    const updatedTeam = await Team.findOneAndUpdate(
        { _id: teamId, owner: ownerId },
        { $pull: { members: new Types.ObjectId(memberId) } },
        { new: true }
    )
        .populate('owner', 'username fullName email')
        .populate('members', 'username fullName email')
        .populate('invites', 'username fullName email');

    return updatedTeam;
}