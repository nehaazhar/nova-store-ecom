import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
	cashOnDeliveryCheckout,
	createRazorpayCheckout,
	getPaymentConfig,
	mockCheckoutSession,
	razorpayPaymentCallback,
	verifyRazorpayPayment,
} from "../controllers/payment.controller.js";

const router = express.Router();

router.get("/config", getPaymentConfig);
router.post("/razorpay/order", protectRoute, createRazorpayCheckout);
router.post("/razorpay/verify", protectRoute, verifyRazorpayPayment);
router.post("/razorpay/callback", razorpayPaymentCallback);
router.get("/razorpay/callback", razorpayPaymentCallback);
router.post("/cod-checkout", protectRoute, cashOnDeliveryCheckout);
router.post("/mock-checkout", protectRoute, mockCheckoutSession);

export default router;
