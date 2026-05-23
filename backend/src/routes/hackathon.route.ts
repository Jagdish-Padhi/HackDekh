import { Router } from "express";
import { getHackathons, getHackathonById } from "../controllers/hackathon.controller.ts";

const router = Router();

router.get("/", getHackathons);
router.get("/:id", getHackathonById);

export default router;
