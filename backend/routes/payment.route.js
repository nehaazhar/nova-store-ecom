import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
	cashOnDeliveryCheckout,
	createRazorpayCheckout,
	getPaymentConfig,
	mockCheckoutSession,
	verifyRazorpayPayment,
} from "../controllers/payment.controller.js";

const router = express.Router();

router.get("/config", getPaymentConfig);
router.post("/razorpay/order", protectRoute, createRazorpayCheckout);
router.post("/razorpay/verify", protectRoute, verifyRazorpayPayment);
router.post("/cod-checkout", protectRoute, cashOnDeliveryCheckout);
router.post("/mock-checkout", protectRoute, mockCheckoutSession);

export default router;
