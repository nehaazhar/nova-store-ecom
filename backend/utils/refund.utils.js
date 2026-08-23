export const isMockStripeSession = (sessionId = "") =>
	String(sessionId).startsWith("MOCK-");

/**
 * Refunds a paid Razorpay order. COD / dummy checkouts skip the gateway.
 */
export const refundPaidOrder = async (order) => {
	if (!order) return { ok: false, message: "Order not found" };
	if (order.refundStatus === "refunded") {
		return { ok: true, already: true };
	}
	if (
		order.paymentMethod === "cod" ||
		order.paymentMethod === "mock" ||
		order.paymentMethod === "stripe" ||
		isMockStripeSession(order.stripeSessionId) ||
		String(order.stripeSessionId).startsWith("COD-")
	) {
		order.refundStatus = "refunded";
		order.refundNote =
			order.paymentMethod === "cod"
				? "COD — no online charge to refund"
				: order.paymentMethod === "stripe"
					? "Legacy Stripe order — refund in Stripe dashboard if charged"
					: "Dummy checkout — no online charge";
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

	return { ok: false, message: "No online payment to refund for this order" };
};
