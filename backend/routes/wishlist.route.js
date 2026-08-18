import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
	addToWishlist,
	getWishlist,
	removeFromWishlist,
	toggleWishlist,
} from "../controllers/wishlist.controller.js";

const router = express.Router();

router.get("/", protectRoute, getWishlist);
router.post("/", protectRoute, addToWishlist);
router.post("/toggle", protectRoute, toggleWishlist);
router.delete("/:productId", protectRoute, removeFromWishlist);

export default router;
