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
    return stage;
}

// ─── Delete Stage ─────────────────────────────────────────────────────────────
export async function deleteStage(stageId: string, userId: Types.ObjectId) {
    const { stage } = await getTeamMembersForStage(stageId, userId);
    if (!stage) return null;

    await TeamHackathon.findByIdAndUpdate(stage.teamHackathon, {
        $pull: { stages: stage._id },
    });

    await Stage.findByIdAndDelete(stageId);
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
