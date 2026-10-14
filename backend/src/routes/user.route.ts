import { Router } from "express";
import {
  registerUser,
  verifyEmail,
  resendVerificationEmail,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  changeCurrentPassword,
  updateAccountDetails,
  getPendingReflections,
  githubAuth,
  googleAuth,
  searchUsers,
} from "../controllers/user.controller.ts";
import { verifyJWT } from "../middlewares/auth.middleware.ts";
import { authRateLimiter, searchRateLimiter, emailRateLimiter } from "../middlewares/rateLimiter.ts";

const router = Router();

router.post("/register", authRateLimiter, registerUser);
router.post("/verify-email", authRateLimiter, verifyEmail);
router.post("/resend-verification", emailRateLimiter, resendVerificationEmail);
router.post("/login", authRateLimiter, loginUser);
router.post("/auth/github", authRateLimiter, githubAuth);
router.post("/auth/google", authRateLimiter, googleAuth);
router.post("/logout", verifyJWT, logoutUser);
router.post("/refresh", authRateLimiter, refreshAccessToken);
router.get("/me", verifyJWT, getCurrentUser);
router.get("/search", verifyJWT, searchRateLimiter, searchUsers);
router.post("/change-password", verifyJWT, authRateLimiter, changeCurrentPassword);
router.put("/update", verifyJWT, updateAccountDetails);

// Pending stage reflections
router.get("/pending-reflections", verifyJWT, getPendingReflections);

export default router;
