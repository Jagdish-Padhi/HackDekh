import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  changeCurrentPassword,
  updateAccountDetails,
  toggleSaveHackathon,
  getSavedHackathons,
  getPendingReflections,
  githubAuth,
  searchUsers,
} from "../controllers/user.controller.ts";
import { verifyJWT } from "../middlewares/auth.middleware.ts";
import { authRateLimiter, searchRateLimiter } from "../middlewares/rateLimiter.ts";

const router = Router();

router.post("/register", authRateLimiter, registerUser);
router.post("/login", authRateLimiter, loginUser);
router.post("/auth/github", authRateLimiter, githubAuth);
router.post("/logout", verifyJWT, logoutUser);
router.post("/refresh", authRateLimiter, refreshAccessToken);
router.get("/me", verifyJWT, getCurrentUser);
router.get("/search", verifyJWT, searchRateLimiter, searchUsers);
router.post("/change-password", verifyJWT, authRateLimiter, changeCurrentPassword);
router.put("/update", verifyJWT, updateAccountDetails);

// Bookmarks / Saved Hackathons
router.post("/saved/:hackathonId", verifyJWT, toggleSaveHackathon);
router.get("/saved", verifyJWT, getSavedHackathons);

// Pending stage reflections
router.get("/pending-reflections", verifyJWT, getPendingReflections);

export default router;
