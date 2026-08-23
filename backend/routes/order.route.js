import express from "express";
import { adminRoute, protectRoute } from "../middleware/auth.middleware.js";
import {
	getAllOrders,
	getMyOrders,
	getOrderById,
	updateOrderStatus,
	cancelMyOrder,
	requestReturn,
	resolveReturn,
	sendSmtpTestEmail,
} from "../controllers/order.controller.js";

const router = express.Router();

router.get("/my-orders", protectRoute, getMyOrders);
router.get("/my-orders/:id", protectRoute, getOrderById);
router.put("/my-orders/:id/cancel", protectRoute, cancelMyOrder);
router.put("/my-orders/:id/return", protectRoute, requestReturn);

router.get("/", protectRoute, adminRoute, getAllOrders);
router.post("/test-email", protectRoute, adminRoute, sendSmtpTestEmail);
router.put("/:id/return", protectRoute, adminRoute, resolveReturn);
router.get("/:id", protectRoute, getOrderById);
router.put("/:id/status", protectRoute, adminRoute, updateOrderStatus);

export default router;
