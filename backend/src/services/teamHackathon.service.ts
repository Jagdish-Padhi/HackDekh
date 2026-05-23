import { Types } from 'mongoose';
import Team from '../models/team.model.ts';
import TeamHackathon from '../models/teamHackathon.model.ts';
import Stage from '../models/stage.model.ts';

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

    const participation = new TeamHackathon({
        team: teamId,
        hackathon: hackathonId,
        status: 'active',
        stages: [],
    });
    await participation.save();

    if (firstStage?.name?.trim()) {
        const stageData: {
            name: string;
            teamHackathon: Types.ObjectId;
            deadline?: Date;
        } = {
            name: firstStage.name.trim(),
            teamHackathon: participation._id as Types.ObjectId,
        };
        if (firstStage.deadline) {
            stageData.deadline = new Date(firstStage.deadline);
        }

        const stage = new Stage(stageData);
        await stage.save();

        await TeamHackathon.findByIdAndUpdate(participation._id, {
            $push: { stages: stage._id },
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
        .populate('hackathon', 'title platform coverImage deadline prize mode location applyLink')
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

    participation.status = status as any;
    await participation.save();

    return getPopulatedParticipation(thId);
}

// ─── Helper: Get Fully Populated Participation ──────────────────────────────
async function getPopulatedParticipation(thId: string) {
    return TeamHackathon.findById(thId)
        .populate('hackathon', 'title platform coverImage deadline prize mode location applyLink')
        .populate({
            path: 'stages',
            model: 'Stage',
        });
}
