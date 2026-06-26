import { Types } from 'mongoose';
import Team from '../models/team.model.ts';
import User from '../models/user.model.ts';
import TeamInvitation from '../models/teamInvitation.model.ts';
import TeamHackathon from '../models/teamHackathon.model.ts';
import Stage from '../models/stage.model.ts';
import crypto from 'crypto';
import { ApiError } from '../utils/apiError.ts';

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

async function generateUniqueTeamCode(): Promise<string> {
    let code = '';
    let exists = true;
    while (exists) {
        code = crypto.randomBytes(3).toString('hex').toUpperCase();
        const team = await Team.findOne({ code });
        if (!team) {
            exists = false;
        }
    }
    return code;
}

export async function createTeam(teamData: CreateTeamInput, ownerId: Types.ObjectId) {
    const trimmedName = teamData.name.trim();
    
    // Case-insensitive check for duplicate team name owned by the same user
    const escapedName = trimmedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const existingTeam = await Team.findOne({
        owner: ownerId,
        name: { $regex: new RegExp('^' + escapedName + '$', 'i') }
    });

    if (existingTeam) {
        const error = new ApiError(409, `You already own a team named "${trimmedName}".`);
        (error as any).existingTeamId = String(existingTeam._id);
        throw error;
    }

    const code = await generateUniqueTeamCode();
    const team = new Team({
        name: trimmedName,
        owner: ownerId,
        members: [ownerId],
        code,
    });

    await team.save();
    return Team.findById(team._id)
        .populate('owner', 'username fullName email')
        .populate('members', 'username fullName email');
}

export async function getUserTeams(userId: Types.ObjectId) {
    const teams = await Team.find({ members: userId })
        .populate('owner', 'username fullName email')
        .populate('members', 'username fullName email')
        .sort({ createdAt: -1 });

    for (const team of teams) {
        if (!team.code) {
            team.code = await generateUniqueTeamCode();
            await team.save();
        }
    }

    return teams;
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

    if (!team.code) {
        team.code = await generateUniqueTeamCode();
        await team.save();
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
        { returnDocument: 'after' }
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
        { returnDocument: 'after' }
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

export async function deleteTeam(teamId: string, ownerId: Types.ObjectId) {
    if (!Types.ObjectId.isValid(teamId)) {
        return null;
    }

    const team = await Team.findOne({ _id: teamId, owner: ownerId });
    if (!team) {
        return null;
    }

    // 1. Find all team hackathon participations
    const participations = await TeamHackathon.find({ team: teamId });
    const participationIds = participations.map(p => p._id);

    // 2. Delete all stages associated with these participations
    if (participationIds.length > 0) {
        await Stage.deleteMany({ teamHackathon: { $in: participationIds } });
    }

    // 3. Delete team hackathon relations
    await TeamHackathon.deleteMany({ team: teamId });

    // 4. Delete invites
    await TeamInvitation.deleteMany({ team: teamId });

    // 5. Delete the team itself
    await Team.deleteOne({ _id: teamId });

    return team;
}

export async function regenerateTeamCode(teamId: string, ownerId: Types.ObjectId) {
    if (!Types.ObjectId.isValid(teamId)) {
        return null;
    }
    const newCode = await generateUniqueTeamCode();
    const updatedTeam = await Team.findOneAndUpdate(
        { _id: teamId, owner: ownerId },
        { $set: { code: newCode } },
        { returnDocument: 'after' }
    )
        .populate('owner', 'username fullName email')
        .populate('members', 'username fullName email');
    return updatedTeam;
}

export async function joinTeamByCode(userId: Types.ObjectId, code: string) {
    if (!code || typeof code !== 'string') {
        return null;
    }
    const normalizedCode = code.trim().toUpperCase();
    const team = await Team.findOne({ code: normalizedCode });
    if (!team) {
        throw new Error('Invalid code. Team not found.');
    }

    const isMember = includesUserId(team.members as unknown[], userId);
    if (isMember) {
        throw new Error('You are already a member of this team.');
    }

    await Team.updateOne(
        { _id: team._id },
        { $addToSet: { members: userId } }
    );

    return Team.findById(team._id)
        .populate('owner', 'username fullName email')
        .populate('members', 'username fullName email');
}

export async function inviteUserByUsernameOrId(teamId: string, ownerId: Types.ObjectId, targetUserIdOrUsername: string) {
    if (!Types.ObjectId.isValid(teamId)) {
        return null;
    }
    const team = await Team.findOne({ _id: teamId, owner: ownerId });
    if (!team) {
        throw new Error('Team not found or you are not authorized.');
    }

    let targetUser = null;
    if (Types.ObjectId.isValid(targetUserIdOrUsername)) {
        targetUser = await User.findById(targetUserIdOrUsername);
    } else {
        targetUser = await User.findOne({ username: targetUserIdOrUsername.toLowerCase() });
    }

    if (!targetUser) {
        throw new Error('User not found.');
    }

    const isMember = includesUserId(team.members as unknown[], targetUser._id);
    if (isMember) {
        throw new Error('User is already a member of this team.');
    }

    const existingInvite = await TeamInvitation.findOne({
        team: teamId,
        invitedUser: targetUser._id,
        status: 'pending'
    });

    if (existingInvite) {
        throw new Error('An invitation is already pending for this user.');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = getExpirationDate(7);

    const invitation = new TeamInvitation({
        team: teamId,
        invitedBy: ownerId,
        invitedUser: targetUser._id,
        invitedEmail: targetUser.email,
        token,
        status: 'pending',
        expiresAt
    });

    await invitation.save();
    return invitation;
}

export async function getUserInvitations(userId: Types.ObjectId) {
    return TeamInvitation.find({ invitedUser: userId, status: 'pending' })
        .populate({
            path: 'team',
            populate: {
                path: 'owner',
                select: 'username fullName email'
            }
        })
        .populate('invitedBy', 'username fullName email')
        .sort({ createdAt: -1 });
}

export async function respondToInvitation(invitationId: string, userId: Types.ObjectId, action: 'accept' | 'decline') {
    if (!Types.ObjectId.isValid(invitationId)) {
        return null;
    }

    const invitation = await TeamInvitation.findOne({ _id: invitationId, invitedUser: userId, status: 'pending' });
    if (!invitation) {
        throw new Error('Invitation not found or not pending.');
    }

    if (new Date() > invitation.expiresAt) {
        invitation.status = 'expired';
        await invitation.save();
        throw new Error('Invitation has expired.');
    }

    if (action === 'accept') {
        const team = await Team.findById(invitation.team);
        if (!team) {
            throw new Error('Team not found.');
        }

        await Team.updateOne(
            { _id: team._id },
            { $addToSet: { members: userId } }
        );

        invitation.status = 'accepted';
        invitation.acceptedBy = userId;
        invitation.acceptedAt = new Date();
        await invitation.save();

        return { status: 'accepted', teamId: team._id };
    } else {
        invitation.status = 'declined';
        await invitation.save();
        return { status: 'declined' };
    }
}