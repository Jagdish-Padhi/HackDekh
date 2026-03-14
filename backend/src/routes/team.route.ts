import { Router } from "express";
import { createTeam, getUserTeams } from "../controllers/team.controller.ts";
import { verifyJWT } from "../middlewares/auth.middleware.ts";

const router = Router();

router.use(verifyJWT);
router.route("/").post(createTeam).get(getUserTeams);

export default router;