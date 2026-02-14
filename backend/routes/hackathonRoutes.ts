import { Router } from "express";
import hackathon from "../models/hackathon.model.ts";

const router = Router();

router.get("/hackathons", async (req, res) => {
  try {
    const hacks = await hackathon.find({});
    res.json(hacks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch hackathons" });
  }
});

export default router;
