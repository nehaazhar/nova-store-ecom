import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
	createReview,
	deleteReview,
	getProductReviews,
	updateReview,
} from "../controllers/review.controller.js";

const router = express.Router();

router.get("/product/:productId", getProductReviews);
router.post("/product/:productId", protectRoute, createReview);
router.put("/:reviewId", protectRoute, updateReview);
router.delete("/:reviewId", protectRoute, deleteReview);

export default router;
