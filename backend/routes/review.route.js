import express from "express";
import { adminRoute, protectRoute } from "../middleware/auth.middleware.js";
import {
	createReview,
	deleteReview,
	getProductReviews,
	replyToReview,
	updateReview,
} from "../controllers/review.controller.js";

const router = express.Router();

router.get("/product/:productId", getProductReviews);
router.post("/product/:productId", protectRoute, createReview);
router.put("/:reviewId", protectRoute, updateReview);
router.put("/:reviewId/reply", protectRoute, adminRoute, replyToReview);
router.delete("/:reviewId", protectRoute, deleteReview);

export default router;
