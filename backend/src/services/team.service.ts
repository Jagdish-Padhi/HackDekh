import Team from '../models/team.model.ts';
import User from '../models/user.model.ts';
import TeamInvitation from '../models/teamInvitation.model.ts';
import { populate } from '../models/populate.ts';
import { TABLES } from '../constants.ts';
import crypto from 'crypto';
import { ApiError } from '../utils/apiError.ts';
import {
    dbQueryAll,
    dbScan,
    dbDelete,
    dbTransactChunks,
    nowISO,
    isNonEmptyString,
    sanitizeUserDoc,
} from '../db/helpers.ts';

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

function toIdString(value: unknown): string {
    if (value && typeof value === 'object' && '_id' in value) {
        return String((value as { _id: unknown })._id);
    }
    return String(value);
}

function includesUserId(list: unknown[] | undefined, userId: string): boolean {
    const target = String(userId);
    return (list || []).some((item) => toIdString(item) === target);
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

async function populateTeam(team: any): Promise<any> {
    if (!team) return null;
    const populated = await populate(team, [
        { path: 'owner', table: TABLES.USERS },
        { path: 'members', table: TABLES.USERS },
    ]);
    if (populated.owner) populated.owner = sanitizeUserDoc(populated.owner);
    if (Array.isArray(populated.members)) {
        populated.members = populated.members.map((m: any) => sanitizeUserDoc(m)).filter(Boolean);
    }
    return populated;
}

async function findTeamForOwner(teamId: string, ownerId: string): Promise<any | null> {
    if (!isNonEmptyString(teamId)) return null;
    const team = await Team.findById(teamId);
    if (!team || team.owner !== String(ownerId)) return null;
    return team;
}

async function revokePendingInvitesForEmail(teamId: string, invitedEmail: string): Promise<void> {
    const invites = await dbScan(TABLES.TEAM_INVITATIONS, {
        filter: 'team = :team AND invitedEmail = :email AND #st = :status',
        names: { '#st': 'status' },
        values: { ':team': teamId, ':email': invitedEmail, ':status': 'pending' },
    });
    for (const invite of invites) {
        await dbDelete(TABLES.TEAM_INVITATIONS, { _id: invite._id });
    }
}

export async function createTeam(teamData: CreateTeamInput, ownerId: string) {
    const trimmedName = teamData.name.trim();

    const ownedTeams = await dbQueryAll({
        table: TABLES.TEAMS,
        index: 'owner-index',
        keyCondition: '#owner = :owner',
        names: { '#owner': 'owner' },
        values: { ':owner': String(ownerId) },
    });
    const existingTeam = ownedTeams.find((t) => String(t.name).toLowerCase() === trimmedName.toLowerCase());
    if (existingTeam) {
        const error = new ApiError(409, `You already own a team named "${trimmedName}".`);
        (error as any).existingTeamId = String(existingTeam._id);
        throw error;
    }

    const code = await generateUniqueTeamCode();
    const team = await Team.create({
        name: trimmedName,
        owner: String(ownerId),
        members: [String(ownerId)],
        code,
    });

    await dbTransactChunks([
        { Put: { TableName: TABLES.TEAM_MEMBERS, Item: { userId: String(ownerId), teamId: team._id } } },
    ]);

    return populateTeam(team);
}

export async function getUserTeams(userId: string) {
    const memberships = await dbQueryAll({
        table: TABLES.TEAM_MEMBERS,
        keyCondition: 'userId = :userId',
        values: { ':userId': String(userId) },
    });
    const teamIds = memberships.map((m) => String(m.teamId));
    const teams = await Team.batchGet(teamIds);
    teams.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    for (const team of teams) {
        if (!team.code) {
            team.code = await generateUniqueTeamCode();
            await Team.save(team);
        }
    }

    const populated: any[] = [];
    for (const team of teams) {
        populated.push(await populateTeam(team));
    }
    return populated;
}

export async function getTeamById(teamId: string, userId: string) {
    if (!isNonEmptyString(teamId)) {
        return null;
    }

    const team = await Team.findById(teamId);
    if (!team) {
        return null;
    }

    const isMember = includesUserId(team.members, String(userId));
    const isOwner = team.owner === String(userId);

    if (!isMember && !isOwner) {
        return null;
    }

    if (!team.code) {
        team.code = await generateUniqueTeamCode();
        await Team.save(team);
    }

    return populateTeam(team);
}

export async function updateTeamName(teamId: string, ownerId: string, name: string) {
    if (!isNonEmptyString(teamId)) {
        return null;
    }

    const team = await findTeamForOwner(teamId, ownerId);
    if (!team) {
        return null;
    }

    const updatedTeam = await Team.findOneAndUpdate(teamId, { name: name.trim() });
    return populateTeam(updatedTeam);
}

export async function addMembers(teamId: string, ownerId: string, memberIds: string[]) {
    if (!isNonEmptyString(teamId)) {
        return null;
    }

    const team = await findTeamForOwner(teamId, ownerId);
    if (!team) {
        return null;
    }

    const validIds = memberIds.filter(isNonEmptyString);
    const existingUsers = await User.batchGet(validIds);
    const existingUserIds = new Set(existingUsers.map((u) => u._id));
    const ownerAsString = String(ownerId);

    const newMemberIds = [...new Set(validIds.map((id) => id.trim()))].filter(
        (id) => id !== ownerAsString && existingUserIds.has(id) && !includesUserId(team.members, id)
    );

    if (newMemberIds.length) {
        team.members = [...new Set([...(team.members || []), ...newMemberIds])];
        team.updatedAt = nowISO();
        const requests = [
            { Put: { TableName: TABLES.TEAMS, Item: team } },
            ...newMemberIds.map((uid) => ({
                Put: { TableName: TABLES.TEAM_MEMBERS, Item: { userId: uid, teamId } },
            })),
        ];
        await dbTransactChunks(requests);
    }

    return populateTeam(await Team.findById(teamId));
}

export async function removeMember(teamId: string, ownerId: string, memberId: string) {
    if (!isNonEmptyString(teamId) || !isNonEmptyString(memberId)) {
        return null;
    }

    if (String(ownerId) === memberId) {
        return null;
    }

    const team = await findTeamForOwner(teamId, ownerId);
    if (!team) {
        return null;
    }

    team.members = (team.members || []).filter((m: string) => String(m) !== memberId);
    team.updatedAt = nowISO();
    await dbTransactChunks([
        { Put: { TableName: TABLES.TEAMS, Item: team } },
        { Delete: { TableName: TABLES.TEAM_MEMBERS, Key: { userId: memberId, teamId } } },
    ]);

    return populateTeam(team);
}

export async function generateInvitationLink(
    teamId: string,
    ownerId: string,
    invitedEmail: string,
    frontendBaseUrl: string
) {
    if (!isNonEmptyString(teamId)) {
        return null;
    }

    const team = await findTeamForOwner(teamId, ownerId);
    if (!team) {
        return null;
    }

    const owner = await User.findById(String(ownerId));
    const normalizedEmail = invitedEmail.trim().toLowerCase();

    // Prevent self-invite
    if (owner?.email?.toLowerCase() === normalizedEmail) {
        throw new ApiError(400, 'You cannot invite yourself.');
    }

    // Prevent inviting existing members
    const targetUser = await User.findOne({ email: normalizedEmail });
    if (targetUser && includesUserId(team.members, targetUser._id)) {
        throw new ApiError(400, 'User is already a member of this team.');
    }

    // Revoke any pending invitations for this email
    await revokePendingInvitesForEmail(teamId, normalizedEmail);

    const token = generateInvitationToken();
    const expiresAt = getExpirationDate(7);

    const invitation = await TeamInvitation.create({
        team: teamId,
        invitedBy: String(ownerId),
        invitedEmail: normalizedEmail,
        token,
        expiresAt: expiresAt.toISOString(),
    });

    const invitationLink = `${frontendBaseUrl}/accept-invitation?token=${token}`;

    return {
        _id: invitation._id,
        token,
        invitedEmail: normalizedEmail,
        invitationLink,
        expiresAt: invitation.expiresAt,
        team: {
            _id: String(team._id),
            name: String(team.name),
            owner: sanitizeUserDoc(owner),
        },
    };
}

export async function getInvitationPreview(token: string) {
    if (!token || token.length !== 64) {
        return null;
    }

    let invitation = await TeamInvitation.findOne({ token });
    if (!invitation) {
        return null;
    }

    const team = await Team.findById(invitation.team);
    if (!team) {
        return null;
    }

    if (invitation.status === 'pending' && new Date() > new Date(invitation.expiresAt)) {
        invitation = await TeamInvitation.findOneAndUpdate(invitation._id, { status: 'expired' });
    }

    if (!invitation) {
        return null;
    }

    const owner = await User.findById(team.owner);

    return {
        invitationId: String(invitation._id),
        invitedEmail: invitation.invitedEmail,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        team: {
            _id: String(team._id),
            name: team.name,
            owner: sanitizeUserDoc(owner),
            memberCount: Array.isArray(team.members) ? team.members.length : 0,
        },
    };
}

export async function acceptInvitationLink(token: string, userId: string, userEmail: string) {
    if (!token || token.length !== 64) {
        return null;
    }

    let invitation = await TeamInvitation.findOne({ token });
    if (!invitation || invitation.status !== 'pending') {
        return null;
    }

    // Check if invitation has expired
    if (new Date() > new Date(invitation.expiresAt)) {
        invitation = await TeamInvitation.findOneAndUpdate(invitation._id, { status: 'expired' });
        return null;
    }

    // Email should match the invited email
    if (String(userEmail).toLowerCase() !== String(invitation.invitedEmail).toLowerCase()) {
        return null;
    }

    const team = await Team.findById(invitation.team);
    if (!team) {
        return null;
    }

    // Check if user is already a member
    if (includesUserId(team.members, userId)) {
        invitation = await TeamInvitation.findOneAndUpdate(invitation._id, {
            status: 'accepted',
            acceptedBy: userId,
            acceptedAt: nowISO(),
        });
        return populateTeam(team);
    }

    // Atomic accept: add to members + companion table + mark invitation accepted
    team.members = [...new Set([...(team.members || []), userId])];
    team.updatedAt = nowISO();
    const requests = [
        { Put: { TableName: TABLES.TEAMS, Item: team } },
        { Put: { TableName: TABLES.TEAM_MEMBERS, Item: { userId, teamId: team._id } } },
        {
            Update: {
                TableName: TABLES.TEAM_INVITATIONS,
                Key: { _id: invitation._id },
                UpdateExpression: 'SET #st = :st, acceptedBy = :ab, acceptedAt = :aa, updatedAt = :up',
                ExpressionAttributeNames: { '#st': 'status' },
                ExpressionAttributeValues: {
                    ':st': 'accepted',
                    ':ab': userId,
                    ':aa': nowISO(),
                    ':up': nowISO(),
                },
            },
        },
    ];
    await dbTransactChunks(requests);

    return populateTeam(team);
}

export async function getTeamInvitations(teamId: string, ownerId: string) {
    if (!isNonEmptyString(teamId)) {
        return null;
    }

    const team = await findTeamForOwner(teamId, ownerId);
    if (!team) {
        return null;
    }

    const invitations = await dbQueryAll({
        table: TABLES.TEAM_INVITATIONS,
        index: 'team-index',
        keyCondition: 'team = :team',
        values: { ':team': teamId },
    });
    invitations.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    const populated = await populate(invitations, [
        { path: 'invitedBy', table: TABLES.USERS },
        { path: 'acceptedBy', table: TABLES.USERS },
    ]);

    for (const invitation of populated) {
        if (invitation.invitedBy) invitation.invitedBy = sanitizeUserDoc(invitation.invitedBy);
        if (invitation.acceptedBy) invitation.acceptedBy = sanitizeUserDoc(invitation.acceptedBy);
    }

    return populated;
}

export async function deleteTeam(teamId: string, ownerId: string) {
    if (!isNonEmptyString(teamId)) {
        return null;
    }

    const team = await findTeamForOwner(teamId, ownerId);
    if (!team) {
        return null;
    }

    const requests: any[] = [];

    // 1. Team hackathon participations + their stages/reflections/pending reflections
    const participations = await dbQueryAll({
        table: TABLES.TEAM_HACKATHONS,
        index: 'team-index',
        keyCondition: 'team = :team',
        values: { ':team': teamId },
    });

    for (const participation of participations) {
        const stages = await dbQueryAll({
            table: TABLES.STAGES,
            index: 'teamhackathon-index',
            keyCondition: 'teamHackathon = :th',
            values: { ':th': participation._id },
        });
        for (const stage of stages) {
            requests.push({ Delete: { TableName: TABLES.STAGES, Key: { _id: stage._id } } });

            const reflections = await dbQueryAll({
                table: TABLES.REFLECTIONS,
                index: 'stage-index',
                keyCondition: 'stage = :stage',
                values: { ':stage': stage._id },
            });
            for (const r of reflections) {
                requests.push({ Delete: { TableName: TABLES.REFLECTIONS, Key: { _id: r._id } } });
            }

            const pending = await dbScan(TABLES.PENDING_REFLECTIONS, {
                filter: 'stageId = :stageId',
                values: { ':stageId': stage._id },
            });
            for (const p of pending) {
                requests.push({ Delete: { TableName: TABLES.PENDING_REFLECTIONS, Key: { userId: p.userId, stageId: stage._id } } });
            }
        }
        requests.push({ Delete: { TableName: TABLES.TEAM_HACKATHONS, Key: { _id: participation._id } } });
    }

    // 2. Invitations
    const invitations = await dbQueryAll({
        table: TABLES.TEAM_INVITATIONS,
        index: 'team-index',
        keyCondition: 'team = :team',
        values: { ':team': teamId },
    });
    for (const invite of invitations) {
        requests.push({ Delete: { TableName: TABLES.TEAM_INVITATIONS, Key: { _id: invite._id } } });
    }

    // 3. Team membership rows
    for (const memberId of team.members || []) {
        requests.push({ Delete: { TableName: TABLES.TEAM_MEMBERS, Key: { userId: String(memberId), teamId } } });
    }

    // 4. The team itself
    requests.push({ Delete: { TableName: TABLES.TEAMS, Key: { _id: teamId } } });

    await dbTransactChunks(requests);

    return team;
}

export async function regenerateTeamCode(teamId: string, ownerId: string) {
    if (!isNonEmptyString(teamId)) {
        return null;
    }

    const team = await findTeamForOwner(teamId, ownerId);
    if (!team) {
        return null;
    }

    const newCode = await generateUniqueTeamCode();
    const updatedTeam = await Team.findOneAndUpdate(teamId, { code: newCode });
    return populateTeam(updatedTeam);
}

export async function joinTeamByCode(userId: string, code: string) {
    if (!isNonEmptyString(code)) {
        return null;
    }

    const normalizedCode = code.trim().toUpperCase();
    const team = await Team.findOne({ code: normalizedCode });
    if (!team) {
        throw new Error('Invalid code. Team not found.');
    }

    if (includesUserId(team.members, userId)) {
        throw new Error('You are already a member of this team.');
    }

    team.members = [...new Set([...(team.members || []), String(userId)])];
    team.updatedAt = nowISO();
    await dbTransactChunks([
        { Put: { TableName: TABLES.TEAMS, Item: team } },
        { Put: { TableName: TABLES.TEAM_MEMBERS, Item: { userId: String(userId), teamId: team._id } } },
    ]);

    return populateTeam(team);
}

export async function inviteUserByUsernameOrId(teamId: string, ownerId: string, targetUserIdOrUsername: string) {
    if (!isNonEmptyString(teamId)) {
        return null;
    }

    const team = await findTeamForOwner(teamId, ownerId);
    if (!team) {
        throw new Error('Team not found or you are not authorized.');
    }

    const target = String(targetUserIdOrUsername || '').trim();
    let targetUser = target ? await User.findById(target) : null;
    if (!targetUser) {
        targetUser = await User.findOne({ username: target.toLowerCase() });
    }
    if (!targetUser) {
        throw new Error('User not found.');
    }

    if (String(targetUser._id) === String(ownerId)) {
        throw new Error('You cannot invite yourself.');
    }

    if (includesUserId(team.members, targetUser._id)) {
        throw new Error('User is already a member of this team.');
    }

    const pendingInvites = await dbQueryAll({
        table: TABLES.TEAM_INVITATIONS,
        index: 'inviteduser-status-index',
        keyCondition: 'invitedUser = :iu AND #st = :st',
        names: { '#st': 'status' },
        values: { ':iu': targetUser._id, ':st': 'pending' },
    });
    if (pendingInvites.some((inv) => String(inv.team) === teamId)) {
        throw new Error('An invitation is already pending for this user.');
    }

    const token = generateInvitationToken();
    const expiresAt = getExpirationDate(7);

    const invitation = await TeamInvitation.create({
        team: teamId,
        invitedBy: String(ownerId),
        invitedUser: targetUser._id,
        invitedEmail: targetUser.email,
        token,
        status: 'pending',
        expiresAt: expiresAt.toISOString(),
    });

    return invitation;
}

export async function getUserInvitations(userId: string) {
    const invitations = await dbQueryAll({
        table: TABLES.TEAM_INVITATIONS,
        index: 'inviteduser-status-index',
        keyCondition: 'invitedUser = :iu AND #st = :st',
        names: { '#st': 'status' },
        values: { ':iu': String(userId), ':st': 'pending' },
    });
    invitations.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    const populated = await populate(invitations, [
        { path: 'team', table: TABLES.TEAMS },
        { path: 'invitedBy', table: TABLES.USERS },
    ]);
    const withOwner = await populate(populated, { path: 'team.owner', table: TABLES.USERS });

    for (const invitation of withOwner) {
        if (invitation.team?.owner) invitation.team.owner = sanitizeUserDoc(invitation.team.owner);
        if (invitation.invitedBy) invitation.invitedBy = sanitizeUserDoc(invitation.invitedBy);
    }

    return withOwner;
}

export async function respondToInvitation(invitationId: string, userId: string, action: 'accept' | 'decline') {
    if (!isNonEmptyString(invitationId)) {
        return null;
    }

    let invitation = await TeamInvitation.findById(invitationId);
    if (!invitation || String(invitation.invitedUser) !== String(userId) || invitation.status !== 'pending') {
        throw new Error('Invitation not found or not pending.');
    }

    if (new Date() > new Date(invitation.expiresAt)) {
        invitation = await TeamInvitation.findOneAndUpdate(invitationId, { status: 'expired' });
        throw new Error('Invitation has expired.');
    }

    if (action === 'accept') {
        const team = await Team.findById(invitation.team);
        if (!team) {
            throw new Error('Team not found.');
        }

        team.members = [...new Set([...(team.members || []), String(userId)])];
        team.updatedAt = nowISO();
        await dbTransactChunks([
            { Put: { TableName: TABLES.TEAMS, Item: team } },
            { Put: { TableName: TABLES.TEAM_MEMBERS, Item: { userId: String(userId), teamId: team._id } } },
            {
                Update: {
                    TableName: TABLES.TEAM_INVITATIONS,
                    Key: { _id: invitation._id },
                    UpdateExpression: 'SET #st = :st, acceptedBy = :ab, acceptedAt = :aa, updatedAt = :up',
                    ExpressionAttributeNames: { '#st': 'status' },
                    ExpressionAttributeValues: {
                        ':st': 'accepted',
                        ':ab': String(userId),
                        ':aa': nowISO(),
                        ':up': nowISO(),
                    },
                },
            },
        ]);

        return { status: 'accepted', teamId: team._id };
    }

    invitation = await TeamInvitation.findOneAndUpdate(invitationId, { status: 'declined' });
    return { status: 'declined' };
}