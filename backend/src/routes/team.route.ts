import { Router } from "express";
import {
    addTeamMembers,
    createTeam,
    getTeamById,
    getUserTeams,
    removeTeamMember,
    updateTeam,
    generateInvitationLink,
    acceptInvitationLink,
    getInvitationPreview,
    getTeamInvitations,
    deleteTeam,
} from "../controllers/team.controller.ts";
import {
    linkTeamToHackathon,
    getTeamHackathons,
    updateParticipationStatus,
    unlinkTeamFromHackathon,
} from "../controllers/teamHackathon.controller.ts";
import {
    addStage,
    updateStage,
    deleteStage,
    addReflection,
} from "../controllers/stage.controller.ts";
import { verifyJWT } from "../middlewares/auth.middleware.ts";

const router = Router();

// ─── Public ──────────────────────────────────────────────────────────────────
router.route("/invitations/accept").post(verifyJWT, acceptInvitationLink);
router.route("/invitations/preview").get(getInvitationPreview);

// ─── Protected ───────────────────────────────────────────────────────────────
router.use(verifyJWT);

// Team CRUD
router.route("/").post(createTeam).get(getUserTeams);
router.route("/:id").get(getTeamById).put(updateTeam).delete(deleteTeam);

// Invitations
router.route("/:id/invites").get(getTeamInvitations);
router.route("/:id/generate-invite-link").post(generateInvitationLink);

// Members
router.route("/:id/members").post(addTeamMembers);
router.route("/:id/members/:userId").delete(removeTeamMember);

// ─── Team–Hackathon participations ───────────────────────────────────────────
router.route("/:id/hackathons").post(linkTeamToHackathon).get(getTeamHackathons);
router.route("/:id/hackathons/:hackathonId").delete(unlinkTeamFromHackathon);
router.route("/:id/hackathons/:thId/status").patch(updateParticipationStatus);

// Stages
router.route("/:id/hackathons/:thId/stages").post(addStage);
router.route("/:id/hackathons/:thId/stages/:stageId").put(updateStage).delete(deleteStage);

// Reflections
router.route("/:id/hackathons/:thId/stages/:stageId/reflections").post(addReflection);

export default router;