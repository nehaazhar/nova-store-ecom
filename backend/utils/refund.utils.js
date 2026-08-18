export const isMockStripeSession = (sessionId = "") =>
	String(sessionId).startsWith("MOCK-");

/**
 * Refunds a paid Stripe order once. Mock checkouts skip Stripe.
 * Duplicate refunds are treated as success (idempotent).
 */
export const refundPaidOrder = async (order) => {
	if (!order) return { ok: false, message: "Order not found" };
	if (order.refundStatus === "refunded") {
		return { ok: true, already: true };
	}
	if (
		order.paymentMethod === "cod" ||
		order.paymentMethod === "mock" ||
		isMockStripeSession(order.stripeSessionId) ||
		String(order.stripeSessionId).startsWith("COD-")
	) {
		order.refundStatus = "refunded";
		order.refundNote =
			order.paymentMethod === "cod"
				? "COD — no online charge to refund"
				: "Mock checkout — no online charge";
		return { ok: true, skipped: true };
	}

	if (order.paymentMethod === "razorpay" || order.razorpayPaymentId) {
		try {
			const { refundRazorpayPayment } = await import("./razorpay.utils.js");
			const refund = await refundRazorpayPayment(order.razorpayPaymentId);
			order.stripeRefundId = refund.id || "";
			order.refundStatus = "refunded";
			return { ok: true, refund };
		} catch (error) {
			if (/already refunded|fully refunded/i.test(error.message || "")) {
				order.refundStatus = "refunded";
				return { ok: true, already: true };
			}
			return { ok: false, message: error.message };
		}
	}

	const { getStripe } = await import("../lib/stripe.js");
	const stripe = getStripe();
	if (!stripe) {
		return { ok: false, message: "Stripe is not configured" };
	}

	let paymentIntentId = order.stripePaymentIntentId;
	if (!paymentIntentId && order.stripeSessionId && process.env.STRIPE_SECRET_KEY) {
		const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
		paymentIntentId =
			typeof session.payment_intent === "string"
				? session.payment_intent
				: session.payment_intent?.id;
		if (paymentIntentId) order.stripePaymentIntentId = paymentIntentId;
	}

	if (!paymentIntentId) {
		return {
			ok: false,
			message: "No Stripe payment to refund for this order",
		};
	}

	try {
		const refund = await stripe.refunds.create({
			payment_intent: paymentIntentId,
			reason: "requested_by_customer",
		});
		order.stripeRefundId = refund.id;
		if (refund.status === "succeeded") order.refundStatus = "refunded";
		else if (refund.status === "pending" || refund.status === "requires_action") {
			order.refundStatus = "pending";
		} else {
			order.refundStatus = "failed";
		}
		return { ok: true, refund };
	} catch (error) {
		if (/already been refunded|has already been refunded/i.test(error.message || "")) {
			order.refundStatus = "refunded";
			return { ok: true, already: true };
		}
		return { ok: false, message: error.message };
	}
};
