import { Router } from "express";
import {
  addStage,
  updateStage,
  deleteStage,
  addReflection,
  removeReflection,
} from "../controllers/stage.controller.ts";

const router = Router({ mergeParams: true });

router.route("/").post(addStage);
router.route("/:stageId").put(updateStage).delete(deleteStage);
router.route("/:stageId/reflections").post(addReflection).delete(removeReflection);

export default router;
