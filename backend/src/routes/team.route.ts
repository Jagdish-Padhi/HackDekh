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
} from "../controllers/team.controller.ts";
import { verifyJWT } from "../middlewares/auth.middleware.ts";

const router = Router();

router.use(verifyJWT);
router.route("/").post(createTeam).get(getUserTeams);
router.route("/:id").get(getTeamById).put(updateTeam);
router.route("/:id/invites").post(addTeamInvites);
router.route("/:id/invites/:userId").delete(removeTeamInvite);
router.route("/:id/members").post(addTeamMembers);
router.route("/:id/members/:userId").delete(removeTeamMember);

export default router;