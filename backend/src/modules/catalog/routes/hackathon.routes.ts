import { Router } from "express";
import { getHackathons } from "../controllers/hackathon.controller.ts";

const router = Router();

router.get("/", getHackathons);

export default router;
