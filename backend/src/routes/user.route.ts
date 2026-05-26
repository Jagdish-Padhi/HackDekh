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
	addApplication,
	updateApplication,
	removeApplication,
	getUserApplications,
	getPendingReflections,
	githubAuth,
} from "../controllers/user.controller.ts";
import { verifyJWT } from "../middlewares/auth.middleware.ts";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/auth/github", githubAuth);
router.post("/logout", verifyJWT, logoutUser);
router.post("/refresh", refreshAccessToken);
router.get("/me", verifyJWT, getCurrentUser);
router.post("/change-password", verifyJWT, changeCurrentPassword);
router.put("/update", verifyJWT, updateAccountDetails);

// Bookmarks / Saved Hackathons
router.post("/saved/:hackathonId", verifyJWT, toggleSaveHackathon);
router.get("/saved", verifyJWT, getSavedHackathons);

// Application Tracker (user-level, individual tracking)
router.post("/applications", verifyJWT, addApplication);
router.put("/applications/:applicationId", verifyJWT, updateApplication);
router.delete("/applications/:applicationId", verifyJWT, removeApplication);
router.get("/applications", verifyJWT, getUserApplications);

// Pending stage reflections (team hackathon system)
router.get("/pending-reflections", verifyJWT, getPendingReflections);

export default router;