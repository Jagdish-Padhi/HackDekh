import { Types } from 'mongoose';
import Team from '../models/team.model.ts';
import TeamHackathon from '../models/teamHackathon.model.ts';
import Stage from '../../tracking/models/stage.model.ts';
import Hackathon from '../../catalog/models/hackathon.model.ts';

// ─── Link Team to Hackathon ────────────────────────────────────────────────
export async function linkTeamToHackathon(
    teamId: string,
    hackathonId: string,
    userId: Types.ObjectId,
    firstStage?: { name: string; deadline?: string }
): Promise<{ error: string } | { participation: unknown }> {
    if (!Types.ObjectId.isValid(teamId) || !Types.ObjectId.isValid(hackathonId)) {
        return { error: 'Invalid team or hackathon ID' };
    }

    const team = await Team.findById(teamId);
    if (!team) return { error: 'Team not found' };

    const isMember = team.members.some((m) => String(m) === String(userId));
    if (!isMember) return { error: 'You are not a member of this team' };

    const existing = await TeamHackathon.findOne({ team: teamId, hackathon: hackathonId });
    if (existing) {
        return { error: 'This team is already registered for that hackathon' };
    }

    const hack = await Hackathon.findById(hackathonId);
    if (!hack) {
        return { error: 'Hackathon not found' };
    }

    const participation = new TeamHackathon({
        team: teamId,
        hackathon: hackathonId,
        status: 'tracking',
        stages: [],
    });
    await participation.save();

    const createdStageIds: Types.ObjectId[] = [];

    const isIgnoredStageName = (name: string) =>
        /register|registration|apply|application|prep|regn/i.test(name) ||
        /^hackathon\s*(start|starts|end|ends)(\s*\/\s*submission|\s*\(finale\))?$/i.test(name.trim());

    // If hackathon has template stages, populate them all!
    if (hack.stages && hack.stages.length > 0) {
        for (const tStage of hack.stages) {
            if (isIgnoredStageName(tStage.name)) continue;
            const stage = new Stage({
                name: tStage.name,
                deadline: tStage.deadline || undefined,
                teamHackathon: participation._id as Types.ObjectId,
                result: 'pending',
            });
            await stage.save();
            createdStageIds.push(stage._id as Types.ObjectId);
        }
    } else if (firstStage?.name?.trim()) {
        // Fallback to custom firstStage
        const stageData: {
            name: string;
            teamHackathon: Types.ObjectId;
            deadline?: Date;
            result: string;
        } = {
            name: firstStage.name.trim(),
            teamHackathon: participation._id as Types.ObjectId,
            result: 'pending',
        };
        if (firstStage.deadline) {
            stageData.deadline = new Date(firstStage.deadline);
        }

        const stage = new Stage(stageData);
        await stage.save();
        createdStageIds.push(stage._id as Types.ObjectId);
    }

    if (createdStageIds.length > 0) {
        await TeamHackathon.findByIdAndUpdate(participation._id, {
            $set: { stages: createdStageIds },
        });
    }

    return { participation: await getPopulatedParticipation(String(participation._id)) };
}

// ─── Get All Participations for a Team ─────────────────────────────────────
export async function getTeamHackathons(teamId: string, userId: Types.ObjectId) {
    if (!Types.ObjectId.isValid(teamId)) return null;

    const team = await Team.findById(teamId);
    if (!team) return null;

    const isMember = team.members.some((m) => String(m) === String(userId));
    if (!isMember) return null;

    return TeamHackathon.find({ team: teamId })
        .populate('hackathon', 'title slug platform coverImage deadline prize mode location applyLink')
        .populate({
            path: 'stages',
            model: 'Stage',
            options: { sort: { createdAt: 1 } },
            populate: {
                path: 'reflections.user',
                select: 'username fullName',
            },
        })
        .sort({ createdAt: -1 });
}

// ─── Update Participation Status ────────────────────────────────────────────
export async function updateParticipationStatus(
    thId: string,
    userId: Types.ObjectId,
    status: string
) {
    if (!Types.ObjectId.isValid(thId)) return null;

    const participation = await TeamHackathon.findById(thId).populate('team');
    if (!participation) return null;

    const team = participation.team as any;
    const isOwner = String(team.owner) === String(userId);
    if (!isOwner) return null;

    // Lock reversion to 'tracking' once the hackathon has been marked as registered/active/etc.
    if (participation.status !== 'tracking' && status === 'tracking') {
        throw new Error('REVERSION_LOCKED');
    }

    participation.status = status as any;
    await participation.save();

    return getPopulatedParticipation(thId);
}

// ─── Toggle 24h Deadline Alert ──────────────────────────────────────────────
export async function toggleParticipationAlert(
    thId: string,
    userId: Types.ObjectId,
    enabled: boolean
) {
    if (!Types.ObjectId.isValid(thId)) return null;

    const participation = await TeamHackathon.findById(thId).populate('team');
    if (!participation) return null;

    const team = participation.team as any;
    const isMember =
        String(team.owner) === String(userId) ||
        (Array.isArray(team.members) && team.members.some((m: any) => String(m) === String(userId)));
    if (!isMember) return null;

    participation.alertEnabled = enabled;
    if (!enabled) {
        participation.alertSentAt = null;
    }
    await participation.save();

    return getPopulatedParticipation(thId);
}

// ─── Move Tracked Hackathon to Another Team ─────────────────────────────────
export async function moveParticipationToTeam(
    thId: string,
    targetTeamId: string,
    userId: Types.ObjectId
): Promise<{ error: string } | { participation: unknown }> {
    if (!Types.ObjectId.isValid(thId) || !Types.ObjectId.isValid(targetTeamId)) {
        return { error: 'Invalid participation or target team ID' };
    }

    const participation = await TeamHackathon.findById(thId).populate('team');
    if (!participation) {
        return { error: 'Tracked hackathon not found' };
    }

    const currentTeam = participation.team as any;
    const isCurrentMember =
        String(currentTeam?.owner) === String(userId) ||
        (Array.isArray(currentTeam?.members) && currentTeam.members.some((m: any) => String(m) === String(userId)));
    if (!isCurrentMember) {
        return { error: 'You are not a member of the current team' };
    }

    if (String(currentTeam?._id) === String(targetTeamId)) {
        return { participation: await getPopulatedParticipation(thId) };
    }

    const targetTeam = await Team.findById(targetTeamId);
    if (!targetTeam) {
        return { error: 'Target team not found' };
    }

    const isTargetMember =
        String(targetTeam.owner) === String(userId) ||
        targetTeam.members.some((m) => String(m) === String(userId));
    if (!isTargetMember) {
        return { error: 'You are not a member of the target team' };
    }

    const duplicate = await TeamHackathon.findOne({
        team: targetTeamId,
        hackathon: participation.hackathon,
    });
    if (duplicate) {
        return { error: `"${targetTeam.name}" is already tracking this hackathon` };
    }

    participation.team = targetTeam._id as Types.ObjectId;
    await participation.save();

    return { participation: await getPopulatedParticipation(thId) };
}

// ─── Unlink Team from Hackathon (Untrack) ──────────────────────────────────
export async function unlinkTeamFromHackathon(
    teamId: string,
    hackathonId: string,
    userId: Types.ObjectId
): Promise<{ error: string } | { success: boolean }> {
    if (!Types.ObjectId.isValid(teamId) || !Types.ObjectId.isValid(hackathonId)) {
        return { error: 'Invalid team or hackathon ID' };
    }

    const team = await Team.findById(teamId);
    if (!team) return { error: 'Team not found' };

    const isMember = team.members.some((m) => String(m) === String(userId));
    if (!isMember) return { error: 'You are not a member of this team' };

    const participation = await TeamHackathon.findOne({ team: teamId, hackathon: hackathonId });
    if (!participation) {
        return { error: 'Tracking record not found' };
    }

    // Delete all associated stages
    await Stage.deleteMany({ teamHackathon: participation._id });

    // Delete the participation itself
    await TeamHackathon.findByIdAndDelete(participation._id);

    return { success: true };
}

// ─── Helper: Get Fully Populated Participation ──────────────────────────────
async function getPopulatedParticipation(thId: string) {
    return TeamHackathon.findById(thId)
        .populate('hackathon', 'title slug platform coverImage deadline prize mode location applyLink')
        .populate({
            path: 'stages',
            model: 'Stage',
        });
}

