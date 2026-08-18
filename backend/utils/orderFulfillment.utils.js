import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import { recordCouponUsage } from "../controllers/coupon.controller.js";
import { resolveShippingAddress } from "../controllers/order.controller.js";
import { sendOrderEmail } from "./email.utils.js";
import { reserveStockForProducts } from "./inventory.utils.js";
import { isDuplicateKeyError } from "./idempotency.utils.js";
import {
	deleteCheckoutPayload,
	loadCheckoutPayload,
} from "./checkoutPayload.utils.js";

const populateNewOrder = async (orderId) =>
	Order.findById(orderId)
		.populate("user", "name email")
		.populate("products.product", "name category price images image");

const paymentIntentFromSession = (session) => {
	const pi = session.payment_intent;
	if (!pi) return "";
	return typeof pi === "string" ? pi : pi.id || "";
};

const resolveCheckoutCart = async (session) => {
	const checkoutId = session.metadata?.checkoutId;
	const cached =
		(await loadCheckoutPayload(checkoutId)) ||
		(await loadCheckoutPayload(session.id));
	if (cached?.products?.length) {
		return cached;
	}

	let products = [];
	try {
		products = JSON.parse(session.metadata?.products || "[]");
	} catch {
		products = [];
	}

	return {
		userId: session.metadata?.userId,
		couponCode: session.metadata?.couponCode || "",
		shippingAddressId: session.metadata?.shippingAddressId || "",
		shippingAddress: session.metadata?.shipFullName
			? {
					fullName: session.metadata.shipFullName,
					phone: session.metadata.shipPhone,
					line1: session.metadata.shipLine1,
					line2: session.metadata.shipLine2 || "",
					city: session.metadata.shipCity,
					state: session.metadata.shipState,
					postalCode: session.metadata.shipPostalCode,
					country: session.metadata.shipCountry || "India",
				}
			: undefined,
		products,
	};
};

/**
 * Creates the order after Stripe reports payment_status=paid.
 * Safe to call from the success page AND the webhook — unique stripeSessionId
 * + duplicate-key catch makes this idempotent.
 */
export const fulfillPaidCheckoutSession = async (session) => {
	if (!session?.id) {
		return { ok: false, status: 400, message: "Missing checkout session" };
	}

	if (session.payment_status !== "paid") {
		return { ok: false, status: 400, message: "Payment has not been completed yet." };
	}

	const sessionId = session.id;
	const existing = await Order.findOne({ stripeSessionId: sessionId });
	if (existing) {
		return { ok: true, already: true, order: existing };
	}

	const cart = await resolveCheckoutCart(session);
	const products = cart.products || [];
	if (!Array.isArray(products) || products.length === 0) {
		return { ok: false, status: 400, message: "Checkout session is missing products" };
	}

	const userId = cart.userId || session.metadata?.userId;
	const preDiscountAmount = products.reduce(
		(sum, product) => sum + Number(product.price) * Number(product.quantity || 1),
		0
	);

	const addressResult = await resolveShippingAddress({
		userId,
		shippingAddressId: cart.shippingAddressId || undefined,
		shippingAddress: cart.shippingAddress,
	});
	if (!addressResult.ok) {
		return { ok: false, status: 400, message: addressResult.message };
	}

	const stockResult = await reserveStockForProducts(
		products.map((p) => ({
			id: p.id,
			quantity: p.quantity,
			size: p.size || "",
			color: p.color || "",
			style: p.style || "",
		}))
	);

	if (cart.couponCode) {
		await recordCouponUsage(cart.couponCode, userId, preDiscountAmount);
	}

	const history = [
		{ status: "pending", note: "Order placed", changedAt: new Date() },
		{ status: "processing", note: "Payment successful", changedAt: new Date() },
	];
	if (!stockResult.ok) {
		history.push({
			status: "processing",
			note: `Paid but stock reservation failed: ${stockResult.message}. Admin review required.`,
			changedAt: new Date(),
		});
	}

	const newOrder = new Order({
		user: userId,
		products: products.map((product) => ({
			product: product.id,
			quantity: product.quantity,
			price: product.price,
			size: product.size || "",
			color: product.color || "",
			style: product.style || "",
		})),
		totalAmount: (session.amount_total || 0) / 100,
		stripeSessionId: sessionId,
		stripePaymentIntentId: paymentIntentFromSession(session),
		shippingAddress: addressResult.address,
		status: "processing",
		stockReservationFailed: !stockResult.ok,
		statusHistory: history,
	});

	try {
		await newOrder.save();
	} catch (error) {
		if (isDuplicateKeyError(error)) {
			const dup = await Order.findOne({ stripeSessionId: sessionId });
			return { ok: true, already: true, order: dup };
		}
		throw error;
	}

	const user = await User.findById(userId);
	if (user) {
		user.cartItems = [];
		await user.save();
	}

	await deleteCheckoutPayload(session.metadata?.checkoutId);
	await deleteCheckoutPayload(sessionId);

	const populated = await populateNewOrder(newOrder._id);
	await sendOrderEmail(populated, "placed");

	return { ok: true, already: false, order: populated || newOrder };
};
