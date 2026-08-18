import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { verifyRazorpaySignature } from "../utils/razorpay.utils.js";

test("Razorpay signature verification accepts valid HMAC", () => {
	const secret = "test_secret";
	const orderId = "order_abc";
	const paymentId = "pay_xyz";
	const signature = crypto
		.createHmac("sha256", secret)
		.update(`${orderId}|${paymentId}`)
		.digest("hex");

	assert.equal(
		verifyRazorpaySignature({ orderId, paymentId, signature, secret }),
		true
	);
});

test("Razorpay signature verification rejects tampered payload", () => {
	assert.equal(
		verifyRazorpaySignature({
			orderId: "order_abc",
			paymentId: "pay_xyz",
			signature: "deadbeef",
			secret: "test_secret",
		}),
		false
	);
});
