import { Types } from 'mongoose';
import Team from '../models/team.model.ts';
import User from '../models/user.model.ts';
import TeamInvitation from '../models/teamInvitation.model.ts';
import crypto from 'crypto';

interface CreateTeamInput {
    name: string;
}

function generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

function getExpirationDate(daysFromNow: number = 7): Date {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
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
    const team = new Team({
        name: teamData.name.trim(),
        owner: ownerId,
        members: [ownerId],
    });

    await team.save();
    return Team.findById(team._id)
        .populate('owner', 'username fullName email')
        .populate('members', 'username fullName email');
}

export async function getUserTeams(userId: Types.ObjectId) {
    return Team.find({ members: userId })
        .populate('owner', 'username fullName email')
    .populate('members', 'username fullName email')
        .sort({ createdAt: -1 });
}

export async function getTeamById(teamId: string, userId: Types.ObjectId) {
    if (!Types.ObjectId.isValid(teamId)) {
        return null;
    }

    const team = await Team.findById(teamId)
        .populate('owner', 'username fullName email')
        .populate('members', 'username fullName email');

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
        .populate('members', 'username fullName email');

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
            { $addToSet: { members: { $each: newMemberIds.map((id) => new Types.ObjectId(id)) } } }
        );
    }

    return Team.findById(team._id)
        .populate('owner', 'username fullName email')
        .populate('members', 'username fullName email');
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
        .populate('members', 'username fullName email');

    return updatedTeam;
}

export async function generateInvitationLink(
    teamId: string,
    ownerId: Types.ObjectId,
    invitedEmail: string,
    frontendBaseUrl: string
) {
    if (!Types.ObjectId.isValid(teamId)) {
        return null;
    }

    const team = await Team.findOne({ _id: teamId, owner: ownerId }).populate('owner', 'username fullName email');
    if (!team) {
        return null;
    }

    const normalizedEmail = invitedEmail.trim().toLowerCase();

    // Revoke any pending invitations for this email
    await TeamInvitation.deleteMany({
        team: teamId,
        invitedEmail: normalizedEmail,
        status: 'pending',
    });

    const token = generateInvitationToken();
    const expiresAt = getExpirationDate(7);

    const invitation = new TeamInvitation({
        team: teamId,
        invitedBy: ownerId,
        invitedEmail: normalizedEmail,
        token,
        expiresAt,
    });

    await invitation.save();

    const invitationLink = `${frontendBaseUrl}/accept-invitation?token=${token}`;

    return {
        _id: invitation._id,
        token,
        invitedEmail: normalizedEmail,
        invitationLink,
        expiresAt,
        team: {
            _id: String(team._id),
            name: String(team.name),
            owner: team.owner,
        },
    };
}

export async function getInvitationPreview(token: string) {
    if (!token || token.length !== 64) {
        return null;
    }

    const invitation = await TeamInvitation.findOne({ token })
        .populate({
            path: 'team',
            populate: {
                path: 'owner',
                select: 'username fullName email',
            },
        })
        .lean();

    if (!invitation || !invitation.team) {
        return null;
    }

    if (invitation.status === 'pending' && new Date() > invitation.expiresAt) {
        await TeamInvitation.updateOne({ _id: invitation._id }, { $set: { status: 'expired' } });
        invitation.status = 'expired';
    }

    const teamDoc = invitation.team as unknown as {
        _id: Types.ObjectId;
        name: string;
        owner: { _id: Types.ObjectId; username?: string; fullName?: string; email?: string };
        members?: Types.ObjectId[];
    };

    return {
        invitationId: String(invitation._id),
        invitedEmail: invitation.invitedEmail,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        team: {
            _id: String(teamDoc._id),
            name: teamDoc.name,
            owner: teamDoc.owner,
            memberCount: Array.isArray(teamDoc.members) ? teamDoc.members.length : 0,
        },
    };
}

export async function acceptInvitationLink(
    token: string,
    userId: Types.ObjectId,
    userEmail: string
) {
    if (!token || token.length !== 64) {
        return null;
    }

    const invitation = await TeamInvitation.findOne({ token, status: 'pending' });
    if (!invitation) {
        return null;
    }

    // Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
        invitation.status = 'expired';
        await invitation.save();
        return null;
    }

    // Email should match the invited email
    if (userEmail.toLowerCase() !== String(invitation.invitedEmail).toLowerCase()) {
        return null;
    }

    const team = await Team.findById(invitation.team);
    if (!team) {
        return null;
    }

    // Check if user is already a member
    const isMember = includesUserId(team.members as unknown[], userId);
    if (isMember) {
        invitation.status = 'accepted';
        invitation.acceptedBy = userId;
        invitation.acceptedAt = new Date();
        await invitation.save();
        return team;
    }

    // Remove from invites if present, add to members
    await Team.updateOne(
        { _id: team._id },
        { $addToSet: { members: userId } }
    );

    // Mark invitation as accepted
    invitation.status = 'accepted';
    invitation.acceptedBy = userId;
    invitation.acceptedAt = new Date();
    await invitation.save();

    return Team.findById(team._id)
        .populate('owner', 'username fullName email')
        .populate('members', 'username fullName email');
}

export async function getTeamInvitations(teamId: string, ownerId: Types.ObjectId) {
    if (!Types.ObjectId.isValid(teamId)) {
        return null;
    }

    const team = await Team.findOne({ _id: teamId, owner: ownerId });
    if (!team) {
        return null;
    }

    return TeamInvitation.find({ team: teamId })
        .populate('invitedBy', 'username fullName email')
        .populate('acceptedBy', 'username fullName email')
        .sort({ createdAt: -1 });
}