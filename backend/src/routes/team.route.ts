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
    regenerateTeamCode,
    joinTeamByCode,
    inviteUserByUsernameOrId,
    getUserInvitations,
    respondToInvitation,
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
    removeReflection,
} from "../controllers/stage.controller.ts";
import { verifyJWT } from "../middlewares/auth.middleware.ts";

const router = Router();

// ─── Public ──────────────────────────────────────────────────────────────────
router.route("/invitations/accept").post(verifyJWT, acceptInvitationLink);
router.route("/invitations/preview").get(getInvitationPreview);

// ─── Protected ───────────────────────────────────────────────────────────────
router.use(verifyJWT);

// Team Join By Code & Fetch Invites
router.route("/join").post(joinTeamByCode);
router.route("/user/invitations").get(getUserInvitations);
router.route("/user/invitations/:invitationId/respond").post(respondToInvitation);

// Team CRUD
router.route("/").post(createTeam).get(getUserTeams);
router.route("/:id").get(getTeamById).put(updateTeam).delete(deleteTeam);

// Join Code Regeneration & Direct User Invites
router.route("/:id/regenerate-code").post(regenerateTeamCode);
router.route("/:id/invitations/user").post(inviteUserByUsernameOrId);

// Invitations (Legacy Email Link)
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
router.route("/:id/hackathons/:thId/stages/:stageId/reflections")
    .post(addReflection)
    .delete(removeReflection);

export default router;