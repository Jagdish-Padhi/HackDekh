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
} from "../controllers/team.controller.ts";
import { verifyJWT } from "../middlewares/auth.middleware.ts";

const router = Router();

// Public route for accepting invitation via token
router.route("/invitations/accept").post(verifyJWT, acceptInvitationLink);
router.route("/invitations/preview").get(getInvitationPreview);

// Protected routes
router.use(verifyJWT);
router.route("/").post(createTeam).get(getUserTeams);
router.route("/:id").get(getTeamById).put(updateTeam);
router.route("/:id/invites").get(getTeamInvitations);
router.route("/:id/generate-invite-link").post(generateInvitationLink);
router.route("/:id/members").post(addTeamMembers);
router.route("/:id/members/:userId").delete(removeTeamMember);

export default router;