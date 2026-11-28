import { Router } from "express";
import { getHackathons, getHackathonBySlug, getHackathonsSitemap } from "../controllers/hackathon.controller.ts";

const router = Router();

router.get("/", getHackathons);
router.get("/sitemap.xml", getHackathonsSitemap);
router.get("/:slug", getHackathonBySlug);

export default router;
