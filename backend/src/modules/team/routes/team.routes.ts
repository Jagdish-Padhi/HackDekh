import { Router } from "express";
import {
    addTeamMembers,
    createTeam,
    getTeamById,
    getUserTeams,
    removeTeamMember,
    updateTeam,
    deleteTeam,
    regenerateTeamCode,
    joinTeamByCode,
    getPublicSquadByCode,
} from "../controllers/team.controller.ts";
import {
    linkTeamToHackathon,
    getTeamHackathons,
    updateParticipationStatus,
    toggleParticipationAlert,
    moveParticipationToTeam,
    unlinkTeamFromHackathon,
} from "../controllers/teamHackathon.controller.ts";
import {
    addStage,
    updateStage,
    deleteStage,
} from "../../tracking/controllers/stage.controller.ts";
import { verifyJWT } from "../../identity/middlewares/auth.middleware.ts";
import { joinCodeRateLimiter } from "../../../shared/middlewares/rateLimiter.ts";

const router = Router();

// ─── Public ──────────────────────────────────────────────────────────────────
router.route("/public/:code").get(getPublicSquadByCode);

// ─── Protected ───────────────────────────────────────────────────────────────
router.use(verifyJWT);

// Team Join By Code
router.route("/join").post(joinCodeRateLimiter, joinTeamByCode);

// Team CRUD
router.route("/").post(createTeam).get(getUserTeams);
router.route("/:id").get(getTeamById).put(updateTeam).delete(deleteTeam);

// Join Code Regeneration
router.route("/:id/regenerate-code").post(regenerateTeamCode);

// Members
router.route("/:id/members").post(addTeamMembers);
router.route("/:id/members/:userId").delete(removeTeamMember);

// ─── Team–Hackathon participations ───────────────────────────────────────────
router.route("/:id/hackathons").post(linkTeamToHackathon).get(getTeamHackathons);
router.route("/:id/hackathons/:hackathonId").delete(unlinkTeamFromHackathon);
router.route("/:id/hackathons/:thId/status").patch(updateParticipationStatus);
router.route("/:id/hackathons/:thId/alert").patch(toggleParticipationAlert);
router.route("/:id/hackathons/:thId/move").patch(moveParticipationToTeam);

// Stages
router.route("/:id/hackathons/:thId/stages").post(addStage);
router.route("/:id/hackathons/:thId/stages/:stageId").put(updateStage).delete(deleteStage);

export default router;