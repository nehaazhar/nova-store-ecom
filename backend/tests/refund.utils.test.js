import test from "node:test";
import assert from "node:assert/strict";
import { isMockStripeSession, refundPaidOrder } from "../utils/refund.utils.js";

test("mock Stripe sessions are skipped for live refunds", () => {
	assert.equal(isMockStripeSession("MOCK-123"), true);
	assert.equal(isMockStripeSession("cs_test_abc"), false);
});

test("refundPaidOrder is idempotent once refunded", async () => {
	const order = { refundStatus: "refunded", stripeSessionId: "cs_test_1" };
	const result = await refundPaidOrder(order);
	assert.equal(result.ok, true);
	assert.equal(result.already, true);
});

test("refundPaidOrder skips gateway for dummy checkouts", async () => {
	const order = { refundStatus: "none", stripeSessionId: "MOCK-999" };
	const result = await refundPaidOrder(order);
	assert.equal(result.ok, true);
	assert.equal(result.skipped, true);
	assert.equal(order.refundStatus, "refunded");
});

test("refundPaidOrder skips legacy Stripe orders", async () => {
	const order = {
		refundStatus: "none",
		paymentMethod: "stripe",
		stripeSessionId: "cs_test_1",
	};
	const result = await refundPaidOrder(order);
	assert.equal(result.ok, true);
	assert.equal(result.skipped, true);
	assert.equal(order.refundStatus, "refunded");
});
