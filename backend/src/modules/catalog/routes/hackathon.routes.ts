import { Router } from "express";
import { getHackathons, getHackathonBySlug } from "../controllers/hackathon.controller.ts";

const router = Router();

router.get("/", getHackathons);
router.get("/:slug", getHackathonBySlug);

export default router;
