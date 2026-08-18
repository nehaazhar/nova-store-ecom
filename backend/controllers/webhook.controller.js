import { getStripe } from "../lib/stripe.js";
import { redis } from "../lib/redis.js";
import { fulfillPaidCheckoutSession } from "../utils/orderFulfillment.utils.js";
import {
	claimOnce,
	stripeEventCacheKey,
	STRIPE_EVENT_TTL_SECONDS,
} from "../utils/idempotency.utils.js";

export const handleStripeWebhook = async (req, res) => {
	const signature = req.headers["stripe-signature"];
	if (!process.env.STRIPE_WEBHOOK_SECRET) {
		console.error("STRIPE_WEBHOOK_SECRET is not configured");
		return res.status(500).json({ message: "Webhook secret is not configured" });
	}

	const stripe = getStripe();
	if (!stripe) {
		return res.status(500).json({ message: "Stripe is not configured" });
	}

	let event;
	try {
		event = stripe.webhooks.constructEvent(
			req.body,
			signature,
			process.env.STRIPE_WEBHOOK_SECRET
		);
	} catch (error) {
		console.error("Stripe webhook signature verification failed:", error.message);
		return res.status(400).send(`Webhook Error: ${error.message}`);
	}

	const claimed = await claimOnce(
		redis,
		stripeEventCacheKey(event.id),
		STRIPE_EVENT_TTL_SECONDS
	);
	if (!claimed) {
		return res.status(200).json({ received: true, duplicate: true });
	}

	try {
		if (event.type === "checkout.session.completed") {
			const session = event.data.object;
			if (session.payment_status === "paid") {
				await fulfillPaidCheckoutSession(session);
			}
		}
	} catch (error) {
		console.error("Stripe webhook handler error:", error.message);
		return res.status(500).json({ message: "Webhook handler failed" });
	}

	return res.status(200).json({ received: true });
};
