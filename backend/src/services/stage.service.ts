import Stage from '../models/stage.model.ts';
import TeamHackathon from '../models/teamHackathon.model.ts';
import Team from '../models/team.model.ts';
import { populate } from '../models/populate.ts';
import { TABLES } from '../constants.ts';
import {
    dbQueryAll,
    dbUpdate,
    dbTransactChunks,
    nowISO,
    genId,
    isNonEmptyString,
    listPendingReflectionStageIds,
    listPendingReflectionUsersForStage,
    sanitizeUserDoc,
} from '../db/helpers.ts';

// ─── Helper: assert caller is a team member ──────────────────────────────────
async function getTeamMembersForStage(stageId: string, userId: string) {
    const stage = await Stage.findById(stageId);
    if (!stage) return { stage: null, members: [] as string[] };

    const th = await TeamHackathon.findById(stage.teamHackathon);
    if (!th) return { stage: null, members: [] as string[] };

    const team = await Team.findById(th.team);
    if (!team) return { stage: null, members: [] as string[] };

    const members = (team.members || []).map((m) => String(m));
    if (!members.includes(String(userId))) return { stage: null, members: [] as string[] };

    return { stage, members };
}

// ─── Sync PENDING_REFLECTIONS companion table from a stage doc ───────────────
async function syncPendingReflections(stageId: string): Promise<void> {
    const stage = await Stage.findById(stageId);
    if (!stage) return;

    const desired = new Set((stage.pendingReflectionFor || []).map((u) => String(u)));
    const existing = await listPendingReflectionUsersForStage(stageId);
    const existingUsers = new Set(existing.map((e) => String(e.userId)));

    const requests: any[] = [];
    for (const uid of desired) {
        if (!existingUsers.has(uid)) {
            requests.push({ Put: { TableName: TABLES.PENDING_REFLECTIONS, Item: { userId: uid, stageId } } });
        }
    }
    for (const item of existing) {
        if (!desired.has(String(item.userId))) {
            requests.push({ Delete: { TableName: TABLES.PENDING_REFLECTIONS, Key: { userId: item.userId, stageId } } });
        }
    }
    await dbTransactChunks(requests);
}

async function clearAllPendingReflectionsForStage(stageId: string): Promise<void> {
    const existing = await listPendingReflectionUsersForStage(stageId);
    const requests = existing.map((item) => ({
        Delete: { TableName: TABLES.PENDING_REFLECTIONS, Key: { userId: item.userId, stageId } },
    }));
    await dbTransactChunks(requests);
}

// ─── Auto Update Team Hackathon Status ─────────────────────────────────────────
async function autoUpdateTeamHackathonStatus(thId: string) {
    const th = await TeamHackathon.findById(thId);
    if (!th) return;

    const stages = (await Stage.batchGet(th.stages || [])).sort((a, b) =>
        String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
    );
    const isRegistrationStageName = (name: string) => /register|registration|apply|application|prep|regn/i.test(name);
    const competitiveStages = stages.filter((s) => !isRegistrationStageName(s.name));

    if (competitiveStages.length === 0) {
        if (th.status !== 'tracking') {
            await TeamHackathon.findOneAndUpdate(thId, { status: 'active' });
        }
        return;
    }

    const failedStageIdx = competitiveStages.findIndex((s) => s.result === 'rejected');
    if (failedStageIdx !== -1) {
        // Reset all subsequent stages to 'pending'
        for (let j = failedStageIdx + 1; j < competitiveStages.length; j++) {
            const subStage = competitiveStages[j];
            if (!subStage) continue;
            if (subStage.result !== 'pending') {
                await dbUpdate(TABLES.STAGES, { _id: subStage._id }, {
                    SET: { result: 'pending', pendingReflectionFor: [] },
                });
                await clearAllPendingReflectionsForStage(String(subStage._id));
            }
        }
        await TeamHackathon.findOneAndUpdate(thId, { status: 'eliminated' });
        return;
    }

    const allQualified = competitiveStages.every((s) => s.result === 'qualified');
    if (allQualified) {
        await TeamHackathon.findOneAndUpdate(thId, { status: 'won' });
        return;
    }

    if (competitiveStages.length >= 2) {
        const lastStage = competitiveStages[competitiveStages.length - 1];
        const priorStages = competitiveStages.slice(0, -1);
        const priorsQualified = priorStages.every((s) => s.result === 'qualified');

        if (lastStage && lastStage.result === 'pending' && priorsQualified) {
            await TeamHackathon.findOneAndUpdate(thId, { status: 'finalist' });
            return;
        }
    }

    if (th.status !== 'tracking' && ['eliminated', 'finalist', 'won'].includes(th.status)) {
        await TeamHackathon.findOneAndUpdate(thId, { status: 'active' });
    }
}

function sanitizeStageUsers(stage: any): any {
    if (Array.isArray(stage.reflections)) {
        stage.reflections = stage.reflections.map((r: any) =>
            r && typeof r === 'object' && r.user ? { ...r, user: sanitizeUserDoc(r.user) } : r
        );
    }
    if (Array.isArray(stage.pendingReflectionFor)) {
        stage.pendingReflectionFor = stage.pendingReflectionFor
            .map((u: any) => sanitizeUserDoc(u))
            .filter(Boolean);
    }
    return stage;
}

async function getPopulatedStage(stageId: string): Promise<any> {
    const stage = await Stage.findById(stageId);
    if (!stage) return null;
    let populated = await populate(stage, { path: 'reflections.user', table: TABLES.USERS });
    populated = await populate(populated, { path: 'pendingReflectionFor', table: TABLES.USERS });
    return sanitizeStageUsers(populated);
}

// ─── Add Stage ───────────────────────────────────────────────────────────────
export async function addStage(
    thId: string,
    userId: string,
    payload: { name: string; deadline?: string }
) {
    if (!isNonEmptyString(thId)) return null;

    const th = await TeamHackathon.findById(thId);
    if (!th) return null;

    const team = await Team.findById(th.team);
    if (!team || !(team.members || []).map(String).includes(String(userId))) return null;

    const stageData: any = {
        name: payload.name.trim(),
        teamHackathon: thId,
        result: 'pending',
    };
    if (payload.deadline) {
        stageData.deadline = new Date(payload.deadline).toISOString();
    }

    const stage = await Stage.create(stageData);

    await TeamHackathon.findOneAndUpdate(thId, { stages: [...(th.stages || []), stage._id] });

    await autoUpdateTeamHackathonStatus(thId);

    return stage;
}

// ─── Update Stage ─────────────────────────────────────────────────────────────
export async function updateStage(
    stageId: string,
    userId: string,
    payload: { name?: string; deadline?: string | null; result?: string; notes?: string }
) {
    const { stage, members } = await getTeamMembersForStage(stageId, userId);
    if (!stage) return null;

    const prevResult = stage.result;

    const SET: Record<string, unknown> = {};
    const REMOVE: string[] = [];

    if (payload.name !== undefined) SET.name = payload.name.trim();
    if (payload.deadline !== undefined) {
        if (payload.deadline) {
            SET.deadline = new Date(payload.deadline).toISOString();
        } else {
            REMOVE.push('deadline');
        }
    }
    if (payload.result !== undefined) SET.result = payload.result;
    if (payload.notes !== undefined) SET.notes = payload.notes;

    if (payload.result === 'pending') {
        SET.pendingReflectionFor = [];
    }

    const resultChanged =
        payload.result !== undefined &&
        prevResult === 'pending' &&
        payload.result !== 'pending';

    if (resultChanged && members.length > 0) {
        const alreadyReflected = (stage.reflections || []).map((r: any) => String(r.user));
        const needReflection = members.filter((id) => !alreadyReflected.includes(id));

        if (needReflection.length > 0) {
            const combined = new Set([...((stage.pendingReflectionFor || []).map(String)), ...needReflection]);
            SET.pendingReflectionFor = [...combined];
        }
    }

    await dbUpdate(TABLES.STAGES, { _id: stageId }, { SET, REMOVE });

    await syncPendingReflections(stageId);

    const thId = String(stage.teamHackathon);
    await autoUpdateTeamHackathonStatus(thId);

    return getPopulatedStage(stageId);
}

// ─── Delete Stage ─────────────────────────────────────────────────────────────
export async function deleteStage(stageId: string, userId: string) {
    const { stage } = await getTeamMembersForStage(stageId, userId);
    if (!stage) return null;

    const thId = String(stage.teamHackathon);

    const th = await TeamHackathon.findById(thId);
    if (th) {
        await TeamHackathon.findOneAndUpdate(thId, {
            stages: (th.stages || []).filter((id) => String(id) !== stageId),
        });
    }

    const requests: any[] = [{ Delete: { TableName: TABLES.STAGES, Key: { _id: stageId } } }];

    const reflections = await dbQueryAll({
        table: TABLES.REFLECTIONS,
        index: 'stage-index',
        keyCondition: 'stage = :stage',
        values: { ':stage': stageId },
    });
    for (const r of reflections) {
        requests.push({ Delete: { TableName: TABLES.REFLECTIONS, Key: { _id: r._id } } });
    }

    const pending = await listPendingReflectionUsersForStage(stageId);
    for (const p of pending) {
        requests.push({ Delete: { TableName: TABLES.PENDING_REFLECTIONS, Key: { userId: p.userId, stageId } } });
    }

    await dbTransactChunks(requests);

    await autoUpdateTeamHackathonStatus(thId);

    return true;
}

// ─── Add / Update Reflection ──────────────────────────────────────────────────
export async function addReflection(
    stageId: string,
    userId: string,
    note: string
) {
    const { stage } = await getTeamMembersForStage(stageId, userId);
    if (!stage) return null;

    const reflections = (stage.reflections || []).slice();
    const existingIndex = reflections.findIndex((r: any) => String(r.user) === String(userId));

    if (existingIndex >= 0) {
        reflections[existingIndex] = { user: String(userId), note };
    } else {
        reflections.push({ user: String(userId), note });
    }

    const pendingReflectionFor = (stage.pendingReflectionFor || [])
        .map(String)
        .filter((uid: string) => uid !== String(userId));

    await dbUpdate(TABLES.STAGES, { _id: stageId }, {
        SET: { reflections, pendingReflectionFor },
    });

    await syncPendingReflections(stageId);

    // Sync the standalone REFLECTIONS table
    const existingRefs = await dbQueryAll({
        table: TABLES.REFLECTIONS,
        index: 'stage-index',
        keyCondition: 'stage = :stage',
        values: { ':stage': stageId },
    });
    const existingRef = existingRefs.find((r) => String(r.user) === String(userId));

    const requests: any[] = [];
    if (existingRef) {
        requests.push({
            Update: {
                TableName: TABLES.REFLECTIONS,
                Key: { _id: existingRef._id },
                UpdateExpression: 'SET note = :note, updatedAt = :up',
                ExpressionAttributeValues: { ':note': note, ':up': nowISO() },
            },
        });
    } else {
        requests.push({
            Put: {
                TableName: TABLES.REFLECTIONS,
                Item: {
                    _id: genId(),
                    stage: stageId,
                    user: String(userId),
                    note,
                    createdAt: nowISO(),
                    updatedAt: nowISO(),
                },
            },
        });
    }
    await dbTransactChunks(requests);

    return getPopulatedStage(stageId);
}

// ─── Get Pending Reflections for a User ───────────────────────────────────────
export async function getPendingReflections(userId: string) {
    const stageIds = await listPendingReflectionStageIds(userId);
    const stages = await Stage.batchGet(stageIds);

    let populated = await populate(stages, { path: 'teamHackathon', table: TABLES.TEAM_HACKATHONS });
    populated = await populate(populated, { path: 'teamHackathon.hackathon', table: TABLES.HACKATHONS });
    populated = await populate(populated, { path: 'teamHackathon.team', table: TABLES.TEAMS });

    return populated.map((stage: any) => {
        const teamHackathon = stage.teamHackathon || null;
        return {
            _id: stage._id,
            name: stage.name,
            result: stage.result,
            deadline: stage.deadline,
            teamHackathon: teamHackathon
                ? {
                      _id: teamHackathon._id,
                      hackathon: teamHackathon.hackathon
                          ? {
                                _id: teamHackathon.hackathon._id,
                                title: teamHackathon.hackathon.title,
                                platform: teamHackathon.hackathon.platform,
                            }
                          : null,
                      team: teamHackathon.team
                          ? {
                                _id: teamHackathon.team._id,
                                name: teamHackathon.team.name,
                            }
                          : null,
                  }
                : null,
        };
    });
}

// ─── Deep Canonical Stage Name Helper ─────────────────────────────────────────
export function getCanonicalStageName(name: string): string {
    const val = name.trim().toLowerCase();
    
    const numWords: Record<string, string> = {
        'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
        'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
        'first': '1', 'second': '2', 'third': '3', 'fourth': '4', 'fifth': '5',
        'sixth': '6', 'seventh': '7', 'eighth': '8', 'ninth': '9', 'tenth': '10',
        '1st': '1', '2nd': '2', '3rd': '3', '4th': '4', '5th': '5',
        '6th': '6', '7th': '7', '8th': '8', '9th': '9', '10th': '10'
    };

    const rawTokens = val.split(/[^a-z0-9]+/);
    const processedTokens: string[] = [];

    for (const rawToken of rawTokens) {
        if (!rawToken) continue;
        
        let token = rawToken;
        const numWordMapped = numWords[token];
        
        if (numWordMapped) {
            token = numWordMapped;
        } else {
            switch (token) {
                case 'i': token = '1'; break;
                case 'ii': token = '2'; break;
                case 'iii': token = '3'; break;
                case 'iv': token = '4'; break;
                case 'v': token = '5'; break;
                case 'vi': token = '6'; break;
                case 'vii': token = '7'; break;
                case 'viii': token = '8'; break;
                case 'ix': token = '9'; break;
                case 'x': token = '10'; break;
            }
        }

        if (/^\d+$/.test(token)) {
            token = parseInt(token, 10).toString();
        }

        processedTokens.push(token);
    }

    processedTokens.sort();
    return processedTokens.join('');
}

// ─── Check duplicate stage ──────────────────────────────────────────────────
export async function stageExists(thId: string, name: string, excludeStageId?: string): Promise<boolean> {
    if (!isNonEmptyString(thId)) return false;

    const stages = await dbQueryAll({
        table: TABLES.STAGES,
        index: 'teamhackathon-index',
        keyCondition: 'teamHackathon = :th',
        values: { ':th': thId },
    });

    const targetCanonical = getCanonicalStageName(name);
    return stages.some((s) => {
        if (excludeStageId && String(s._id) === String(excludeStageId)) {
            return false;
        }
        return getCanonicalStageName(String(s.name)) === targetCanonical;
    });
}

// ─── Remove Reflection ────────────────────────────────────────────────────────
export async function removeReflection(
    stageId: string,
    userId: string
) {
    const { stage } = await getTeamMembersForStage(stageId, userId);
    if (!stage) return null;

    const reflections = (stage.reflections || []).filter((r: any) => String(r.user) !== String(userId));

    const pendingReflectionFor = new Set([...((stage.pendingReflectionFor || []).map(String)), String(userId)]);

    await dbUpdate(TABLES.STAGES, { _id: stageId }, {
        SET: { reflections, pendingReflectionFor: [...pendingReflectionFor] },
    });

    await syncPendingReflections(stageId);

    const existingRefs = await dbQueryAll({
        table: TABLES.REFLECTIONS,
        index: 'stage-index',
        keyCondition: 'stage = :stage',
        values: { ':stage': stageId },
    });
    const existingRef = existingRefs.find((r) => String(r.user) === String(userId));
    if (existingRef) {
        await dbTransactChunks([
            { Delete: { TableName: TABLES.REFLECTIONS, Key: { _id: existingRef._id } } },
        ]);
    }

    return getPopulatedStage(stageId);
}
