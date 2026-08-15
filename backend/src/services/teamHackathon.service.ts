import Team from '../models/team.model.ts';
import TeamHackathon from '../models/teamHackathon.model.ts';
import Stage from '../models/stage.model.ts';
import Hackathon from '../models/hackathon.model.ts';
import { populate } from '../models/populate.ts';
import { TABLES } from '../constants.ts';
import {
    dbQueryAll,
    dbScan,
    dbTransactChunks,
    isNonEmptyString,
    sanitizeUserDoc,
} from '../db/helpers.ts';

function includesUserId(list: unknown[] | undefined, userId: string): boolean {
    return (list || []).some((m) => String(m) === String(userId));
}

function sanitizeStageUsers(stage: any): any {
    if (Array.isArray(stage.reflections)) {
        stage.reflections = stage.reflections.map((r: any) =>
            r && typeof r === 'object' && r.user
                ? { ...r, user: sanitizeUserDoc(r.user) }
                : r
        );
    }
    if (Array.isArray(stage.pendingReflectionFor)) {
        stage.pendingReflectionFor = stage.pendingReflectionFor
            .map((u: any) => sanitizeUserDoc(u))
            .filter(Boolean);
    }
    return stage;
}

async function populateStages(stages: any[]): Promise<any[]> {
    let populated = await populate(stages, { path: 'reflections.user', table: TABLES.USERS });
    populated = await populate(populated, { path: 'pendingReflectionFor', table: TABLES.USERS });
    return populated.map(sanitizeStageUsers);
}

// ─── Link Team to Hackathon ────────────────────────────────────────────────
export async function linkTeamToHackathon(
    teamId: string,
    hackathonId: string,
    userId: string,
    firstStage?: { name: string; deadline?: string }
): Promise<{ error: string } | { participation: unknown }> {
    if (!isNonEmptyString(teamId) || !isNonEmptyString(hackathonId)) {
        return { error: 'Invalid team or hackathon ID' };
    }

    const team = await Team.findById(teamId);
    if (!team) return { error: 'Team not found' };

    if (!includesUserId(team.members, userId)) return { error: 'You are not a member of this team' };

    const existing = await dbQueryAll({
        table: TABLES.TEAM_HACKATHONS,
        index: 'team-index',
        keyCondition: 'team = :team',
        values: { ':team': teamId },
    });
    if (existing.some((th) => String(th.hackathon) === hackathonId)) {
        return { error: 'This team is already registered for that hackathon' };
    }

    const hack = await Hackathon.findById(hackathonId);
    if (!hack) {
        return { error: 'Hackathon not found' };
    }

    const participation = await TeamHackathon.create({
        team: teamId,
        hackathon: hackathonId,
        status: 'tracking',
        stages: [],
    });

    const createdStageIds: string[] = [];

    const isRegistrationStageName = (name: string) => /register|registration|apply|application|prep|regn/i.test(name);

    // If hackathon has template stages, populate them all!
    if (hack.stages && hack.stages.length > 0) {
        for (const tStage of hack.stages) {
            if (isRegistrationStageName(tStage.name)) continue;
            const stageData: any = {
                name: tStage.name,
                teamHackathon: participation._id,
                result: 'pending',
            };
            if (tStage.deadline) {
                stageData.deadline = tStage.deadline;
            }
            const stage = await Stage.create(stageData);
            createdStageIds.push(stage._id);
        }
    } else if (firstStage?.name?.trim()) {
        // Fallback to custom firstStage
        const stageData: any = {
            name: firstStage.name.trim(),
            teamHackathon: participation._id,
            result: 'pending',
        };
        if (firstStage.deadline) {
            stageData.deadline = new Date(firstStage.deadline).toISOString();
        }

        const stage = await Stage.create(stageData);
        createdStageIds.push(stage._id);
    }

    if (createdStageIds.length > 0) {
        await TeamHackathon.findOneAndUpdate(participation._id, { stages: createdStageIds });
    }

    return { participation: await getPopulatedParticipation(String(participation._id)) };
}

// ─── Get All Participations for a Team ─────────────────────────────────────
export async function getTeamHackathons(teamId: string, userId: string) {
    if (!isNonEmptyString(teamId)) return null;

    const team = await Team.findById(teamId);
    if (!team) return null;

    if (!includesUserId(team.members, userId)) return null;

    const participations = await dbQueryAll({
        table: TABLES.TEAM_HACKATHONS,
        index: 'team-index',
        keyCondition: 'team = :team',
        values: { ':team': teamId },
    });
    participations.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    const populated = await populate(participations, { path: 'hackathon', table: TABLES.HACKATHONS });

    const stageIds = participations.flatMap((th) => (th.stages || []) as string[]);
    let stages = await Stage.batchGet(stageIds);
    stages.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    stages = await populateStages(stages);

    const stageById = new Map(stages.map((s) => [s._id, s]));
    for (const th of populated) {
        th.stages = (th.stages || []).map((id: string) => stageById.get(id)).filter(Boolean);
    }

    return populated;
}

// ─── Update Participation Status ────────────────────────────────────────────
export async function updateParticipationStatus(
    thId: string,
    userId: string,
    status: string
) {
    if (!isNonEmptyString(thId)) return null;

    const participation = await TeamHackathon.findById(thId);
    if (!participation) return null;

    const team = await Team.findById(participation.team);
    if (!team || String(team.owner) !== String(userId)) return null;

    // Lock reversion to 'tracking' once the hackathon has been marked as registered/active/etc.
    if (participation.status !== 'tracking' && status === 'tracking') {
        throw new Error('REVERSION_LOCKED');
    }

    await TeamHackathon.findOneAndUpdate(thId, { status: status as any });

    return getPopulatedParticipation(thId);
}

// ─── Unlink Team from Hackathon (Untrack) ──────────────────────────────────
export async function unlinkTeamFromHackathon(
    teamId: string,
    hackathonId: string,
    userId: string
): Promise<{ error: string } | { success: boolean }> {
    if (!isNonEmptyString(teamId) || !isNonEmptyString(hackathonId)) {
        return { error: 'Invalid team or hackathon ID' };
    }

    const team = await Team.findById(teamId);
    if (!team) return { error: 'Team not found' };

    if (!includesUserId(team.members, userId)) return { error: 'You are not a member of this team' };

    const participations = await dbQueryAll({
        table: TABLES.TEAM_HACKATHONS,
        index: 'team-index',
        keyCondition: 'team = :team',
        values: { ':team': teamId },
    });
    const participation = participations.find((th) => String(th.hackathon) === hackathonId);
    if (!participation) {
        return { error: 'Tracking record not found' };
    }

    const stages = await dbQueryAll({
        table: TABLES.STAGES,
        index: 'teamhackathon-index',
        keyCondition: 'teamHackathon = :th',
        values: { ':th': participation._id },
    });

    // Cascade delete: stages + reflections + pending reflections + participation (atomic)
    const requests: any[] = [];
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

    await dbTransactChunks(requests);

    return { success: true };
}

// ─── Helper: Get Fully Populated Participation ──────────────────────────────
async function getPopulatedParticipation(thId: string) {
    const participation = await TeamHackathon.findById(thId);
    if (!participation) return null;

    let populated = await populate(participation, { path: 'hackathon', table: TABLES.HACKATHONS });

    const stageIds = (participation.stages || []) as string[];
    let stages = await Stage.batchGet(stageIds);
    stages.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    stages = await populateStages(stages);

    populated.stages = stages;
    return populated;
}