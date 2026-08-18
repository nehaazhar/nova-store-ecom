import express from "express";
import {
	changePassword,
	forgotPassword,
	getProfile,
	login,
	logout,
	refreshToken,
	resendVerification,
	resetPassword,
	signup,
	updateProfile,
	verifyEmail,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { authLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

router.post("/signup", authLimiter, asyncHandler(signup));
router.post("/login", authLimiter, asyncHandler(login));
router.post("/logout", asyncHandler(logout));
router.post("/refresh-token", asyncHandler(refreshToken));
router.post("/verify-email", asyncHandler(verifyEmail));
router.post("/resend-verification", authLimiter, asyncHandler(resendVerification));
router.post("/forgot-password", authLimiter, asyncHandler(forgotPassword));
router.post("/reset-password", authLimiter, asyncHandler(resetPassword));
router.get("/profile", protectRoute, asyncHandler(getProfile));
router.put("/profile", protectRoute, asyncHandler(updateProfile));
router.put("/password", protectRoute, asyncHandler(changePassword));

export default router;
