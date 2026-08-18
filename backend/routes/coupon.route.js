import express from "express";
import { adminRoute, protectRoute } from "../middleware/auth.middleware.js";
import {
	createCoupon,
	deleteCoupon,
	getAdminCoupons,
	getCoupon,
	getCouponStats,
	getCouponUsageHistory,
	toggleCouponStatus,
	updateCoupon,
	validateCoupon,
} from "../controllers/coupon.controller.js";

const router = express.Router();

router.get("/", protectRoute, getCoupon);
router.post("/validate", protectRoute, validateCoupon);

router.get("/admin", protectRoute, adminRoute, getAdminCoupons);
router.get("/admin/stats", protectRoute, adminRoute, getCouponStats);
router.get("/admin/usage-history", protectRoute, adminRoute, getCouponUsageHistory);
router.post("/admin", protectRoute, adminRoute, createCoupon);
router.patch("/admin/:id", protectRoute, adminRoute, toggleCouponStatus);
router.put("/admin/:id", protectRoute, adminRoute, updateCoupon);
router.delete("/admin/:id", protectRoute, adminRoute, deleteCoupon);

export default router;
