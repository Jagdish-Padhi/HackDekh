import { Router } from "express";
import {
	addTeamInvites,
	addTeamMembers,
	createTeam,
	getTeamById,
	getUserTeams,
	removeTeamInvite,
	removeTeamMember,
	updateTeam,
	generateInvitationLink,
	acceptInvitationLink,
} from "../controllers/team.controller.ts";
import { verifyJWT } from "../middlewares/auth.middleware.ts";

const router = Router();

// Public route for accepting invitation
router.route("/invitations/accept").get(verifyJWT, acceptInvitationLink);

// Protected routes
router.use(verifyJWT);
router.route("/").post(createTeam).get(getUserTeams);
router.route("/:id").get(getTeamById).put(updateTeam);
router.route("/:id/invites").post(addTeamInvites);
router.route("/:id/invites/link").post(generateInvitationLink);
router.route("/:id/invites/:userId").delete(removeTeamInvite);
router.route("/:id/members").post(addTeamMembers);
router.route("/:id/members/:userId").delete(removeTeamMember);

export default router;