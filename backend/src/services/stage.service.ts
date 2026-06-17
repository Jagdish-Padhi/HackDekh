import { Types } from 'mongoose';
import Stage from '../models/stage.model.ts';
import TeamHackathon from '../models/teamHackathon.model.ts';
import Team from '../models/team.model.ts';

// ─── Helper: assert caller is a team member ──────────────────────────────────
async function getTeamMembersForStage(stageId: string, userId: Types.ObjectId) {
    const stage = await Stage.findById(stageId).populate({
        path: 'teamHackathon',
        populate: { path: 'team', select: 'members owner' },
    });

    if (!stage) return { stage: null, members: [] as Types.ObjectId[] };

    const th = stage.teamHackathon as any;
    const team = th?.team as any;
    if (!team) return { stage, members: [] as Types.ObjectId[] };

    const isMember = (team.members as Types.ObjectId[]).some(
        (m) => String(m) === String(userId)
    );
    if (!isMember) return { stage: null, members: [] as Types.ObjectId[] };

    return { stage, members: team.members as Types.ObjectId[] };
}

// ─── Auto Update Team Hackathon Status ─────────────────────────────────────────
async function autoUpdateTeamHackathonStatus(thId: string) {
    const th = await TeamHackathon.findById(thId).populate('stages');
    if (!th) return;

    const stages = th.stages as any[];
    const isRegistrationStageName = (name: string) => /register|registration|apply|application|prep|regn/i.test(name);
    const competitiveStages = stages.filter(s => !isRegistrationStageName(s.name));

    if (competitiveStages.length === 0) {
        if (th.status !== 'tracking') {
            th.status = 'active';
            await th.save();
        }
        return;
    }

    const failedStageIdx = competitiveStages.findIndex(s => s.result === 'rejected');
    if (failedStageIdx !== -1) {
        // Reset all subsequent stages to 'pending'
        for (let j = failedStageIdx + 1; j < competitiveStages.length; j++) {
            const subStage = competitiveStages[j];
            if (subStage.result !== 'pending') {
                subStage.result = 'pending';
                subStage.pendingReflectionFor = [];
                await subStage.save();
            }
        }
        th.status = 'eliminated';
        await th.save();
        return;
    }

    const allQualified = competitiveStages.every(s => s.result === 'qualified');
    if (allQualified) {
        th.status = 'won';
        await th.save();
        return;
    }

    if (competitiveStages.length >= 2) {
        const lastStage = competitiveStages[competitiveStages.length - 1];
        const priorStages = competitiveStages.slice(0, -1);
        const priorsQualified = priorStages.every(s => s.result === 'qualified');

        if (lastStage.result === 'pending' && priorsQualified) {
            th.status = 'finalist';
            await th.save();
            return;
        }
    }

    if (th.status !== 'tracking' && ['eliminated', 'finalist', 'won'].includes(th.status)) {
        th.status = 'active';
        await th.save();
    }
}

// ─── Add Stage ───────────────────────────────────────────────────────────────
export async function addStage(
    thId: string,
    userId: Types.ObjectId,
    payload: { name: string; deadline?: string }
) {
    if (!Types.ObjectId.isValid(thId)) return null;

    const th = await TeamHackathon.findById(thId).populate('team');
    if (!th) return null;

    const team = th.team as any;
    const isMember = (team.members as Types.ObjectId[]).some(
        (m) => String(m) === String(userId)
    );
    if (!isMember) return null;

    const stageData: { name: string; teamHackathon: string; deadline?: Date } = {
        name: payload.name.trim(),
        teamHackathon: thId,
    };
    if (payload.deadline) {
        stageData.deadline = new Date(payload.deadline);
    }

    const stage = new Stage(stageData);
    await stage.save();

    await TeamHackathon.findByIdAndUpdate(thId, {
        $push: { stages: stage._id },
    });

    await autoUpdateTeamHackathonStatus(thId);

    return stage;
}

// ─── Update Stage ─────────────────────────────────────────────────────────────
export async function updateStage(
    stageId: string,
    userId: Types.ObjectId,
    payload: { name?: string; deadline?: string | null; result?: string; notes?: string }
) {
    const { stage, members } = await getTeamMembersForStage(stageId, userId);
    if (!stage) return null;

    const prevResult = stage.result;

    if (payload.name !== undefined) stage.name = payload.name.trim();
    if (payload.deadline !== undefined) {
        if (payload.deadline) {
            (stage as any).deadline = new Date(payload.deadline);
        } else {
            (stage as any).deadline = null;
        }
    }
    if (payload.result !== undefined) stage.result = payload.result as any;
    if (payload.notes !== undefined) stage.notes = payload.notes;

    if (payload.result === 'pending') {
        stage.pendingReflectionFor = [];
    }

    const resultChanged =
        payload.result !== undefined &&
        prevResult === 'pending' &&
        payload.result !== 'pending';

    if (resultChanged && members.length > 0) {
        const alreadyReflected = stage.reflections.map((r: any) => String(r.user));
        const needReflection = members
            .map((m) => String(m))
            .filter((id) => !alreadyReflected.includes(id));

        if (needReflection.length > 0) {
            (stage as any).pendingReflectionFor = [
                ...((stage as any).pendingReflectionFor || []),
                ...needReflection.map((id) => new Types.ObjectId(id)),
            ];
        }
    }

    await stage.save();

    const thId = stage.teamHackathon?._id ? String(stage.teamHackathon._id) : String(stage.teamHackathon);
    await autoUpdateTeamHackathonStatus(thId);

    return stage;
}

// ─── Delete Stage ─────────────────────────────────────────────────────────────
export async function deleteStage(stageId: string, userId: Types.ObjectId) {
    const { stage } = await getTeamMembersForStage(stageId, userId);
    if (!stage) return null;

    const thId = stage.teamHackathon?._id ? String(stage.teamHackathon._id) : String(stage.teamHackathon);

    await TeamHackathon.findByIdAndUpdate(thId, {
        $pull: { stages: stage._id },
    });

    await Stage.findByIdAndDelete(stageId);

    await autoUpdateTeamHackathonStatus(thId);

    return true;
}

// ─── Add / Update Reflection ──────────────────────────────────────────────────
export async function addReflection(
    stageId: string,
    userId: Types.ObjectId,
    note: string
) {
    const { stage } = await getTeamMembersForStage(stageId, userId);
    if (!stage) return null;

    const existingIndex = stage.reflections.findIndex(
        (r: any) => String(r.user) === String(userId)
    );

    if (existingIndex >= 0) {
        (stage.reflections as any)[existingIndex] = { user: userId, note };
    } else {
        (stage.reflections as any).push({ user: userId, note });
    }

    (stage as any).pendingReflectionFor = ((stage as any).pendingReflectionFor || []).filter(
        (uid: any) => String(uid) !== String(userId)
    );

    await stage.save();

    return Stage.findById(stageId)
        .populate('reflections.user', 'username fullName')
        .populate('pendingReflectionFor', 'username fullName');
}

// ─── Get Pending Reflections for a User ───────────────────────────────────────
export async function getPendingReflections(userId: Types.ObjectId) {
    return Stage.find({ pendingReflectionFor: userId })
        .select('name result deadline teamHackathon')
        .populate({
            path: 'teamHackathon',
            select: 'hackathon team',
            populate: [
                { path: 'hackathon', select: 'title platform' },
                { path: 'team', select: 'name' },
            ],
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
    if (!Types.ObjectId.isValid(thId)) return false;
    const stages = await Stage.find({ teamHackathon: thId }).select('name');
    const targetCanonical = getCanonicalStageName(name);
    return stages.some(s => {
        if (excludeStageId && String(s._id) === String(excludeStageId)) {
            return false;
        }
        const canonical = getCanonicalStageName(s.name);
        return canonical === targetCanonical;
    });
}

// ─── Remove Reflection ────────────────────────────────────────────────────────
export async function removeReflection(
    stageId: string,
    userId: Types.ObjectId
) {
    const { stage } = await getTeamMembersForStage(stageId, userId);
    if (!stage) return null;

    (stage as any).reflections = stage.reflections.filter(
        (r: any) => String(r.user) !== String(userId)
    );

    // Put user back into pendingReflectionFor if not present
    if (!(stage.pendingReflectionFor || []).some((uid: any) => String(uid) === String(userId))) {
        (stage.pendingReflectionFor as any).push(userId);
    }

    await stage.save();

    return Stage.findById(stageId)
        .populate('reflections.user', 'username fullName')
        .populate('pendingReflectionFor', 'username fullName');
}
