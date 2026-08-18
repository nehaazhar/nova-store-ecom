import crypto from "crypto";
import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import { getStripe, getStripeCurrency, isStripeConfigured } from "../lib/stripe.js";
import { isCouponApplicable } from "../utils/coupon.utils.js";
import { recordCouponUsage } from "./coupon.controller.js";
import { reserveStockForProducts, getVariantStock } from "../utils/inventory.utils.js";
import { resolveShippingAddress } from "./order.controller.js";
import { sendOrderEmail } from "../utils/email.utils.js";
import { fulfillPaidCheckoutSession } from "../utils/orderFulfillment.utils.js";
import { saveCheckoutPayload, loadCheckoutPayload, deleteCheckoutPayload } from "../utils/checkoutPayload.utils.js";
import {
	createRazorpayOrder,
	isRazorpayConfigured,
	verifyRazorpaySignature,
} from "../utils/razorpay.utils.js";

export const getPaymentConfig = async (_req, res) => {
	const razorpay = isRazorpayConfigured();
	const stripe = isStripeConfigured();
	res.json({
		configured: stripe,
		stripe,
		razorpay,
		publishableKey: stripe ? String(process.env.STRIPE_PUBLISHABLE_KEY || "").trim() : "",
		razorpayKeyId: razorpay ? String(process.env.RAZORPAY_KEY_ID || "").trim() : "",
		currency: razorpay ? "inr" : getStripeCurrency(),
		gateway: razorpay ? "razorpay" : stripe ? "stripe" : "none",
	});
};

const validateStockAvailability = async (products) => {
	for (const item of products) {
		const productId = item._id || item.id || item.productId;
		const quantity = Number(item.quantity || 1);
		const product = await Product.findById(productId);
		if (!product) {
			return { ok: false, message: "One or more products were not found" };
		}
		const available = getVariantStock(product, {
			size: item.size || "",
			color: item.color || "",
			style: item.style || "",
		});
		const label = [product.name, item.size, item.color, item.style]
			.filter(Boolean)
			.join(" / ");
		if (available < quantity) {
			return {
				ok: false,
				message: `"${label}" has only ${available} left in stock`,
			};
		}
	}
	return { ok: true };
};

const populateNewOrder = async (orderId) =>
	Order.findById(orderId)
		.populate("user", "name email")
		.populate("products.product", "name category price images image");

export const createCheckoutSession = async (req, res) => {
	try {
		const { products, couponCode, shippingAddress, shippingAddressId } = req.body;

		if (!Array.isArray(products) || products.length === 0) {
			return res.status(400).json({ error: "Invalid or empty products array" });
		}

		const stripe = getStripe();
		if (!stripe) {
			return res.status(500).json({
				error:
					"Stripe is not configured. Add a real STRIPE_SECRET_KEY (sk_test_...) from https://dashboard.stripe.com/test/apikeys to the root .env file and restart the server.",
			});
		}

		if (!process.env.CLIENT_URL) {
			return res.status(500).json({ error: "CLIENT_URL is not configured" });
		}

		const addressResult = await resolveShippingAddress({
			userId: req.user._id,
			shippingAddress,
			shippingAddressId,
		});
		if (!addressResult.ok) {
			return res.status(400).json({ error: addressResult.message });
		}

		const stockCheck = await validateStockAvailability(products);
		if (!stockCheck.ok) {
			return res.status(400).json({ error: stockCheck.message });
		}

		const currency = getStripeCurrency();
		let totalAmount = 0;

		const lineItems = products.map((product) => {
			const amount = Math.round(Number(product.price) * 100);
			if (!Number.isFinite(amount) || amount < 1) {
				throw new Error(`Invalid price for "${product.name || "product"}"`);
			}
			totalAmount += amount * (product.quantity || 1);

			const productData = {
				name: product.name || "Product",
			};

			const imageUrl = product.images?.[0] || product.image;
			if (typeof imageUrl === "string" && imageUrl.startsWith("https://")) {
				productData.images = [imageUrl];
			}

			return {
				price_data: {
					currency,
					product_data: productData,
					unit_amount: amount,
				},
				quantity: product.quantity || 1,
			};
		});

		const minCharge = 50;
		if (totalAmount < minCharge) {
			return res.status(400).json({
				error: `Stripe requires a minimum of ${minCharge / 100} ${currency.toUpperCase()}`,
			});
		}

		let coupon = null;
		if (couponCode) {
			coupon = await Coupon.findOne({
				code: String(couponCode).trim().toUpperCase(),
				isActive: true,
			});
			const orderSubtotalDollars = totalAmount / 100;
			if (coupon && isCouponApplicable(coupon, orderSubtotalDollars, req.user._id)) {
				totalAmount -= Math.round((totalAmount * coupon.discountPercentage) / 100);
			} else {
				coupon = null;
			}
		}

		if (totalAmount < minCharge) {
			return res.status(400).json({
				error: `Amount after discount is below Stripe minimum of ${minCharge / 100} ${currency.toUpperCase()}`,
			});
		}

		const checkoutId = crypto.randomUUID();
		const compactProducts = products.map((p) => ({
			id: p._id || p.id,
			quantity: p.quantity,
			price: p.price,
			size: p.size || "",
			color: p.color || "",
			style: p.style || "",
		}));

		const session = await stripe.checkout.sessions.create({
			mode: "payment",
			customer_email: req.user.email || undefined,
			line_items: lineItems,
			success_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${process.env.CLIENT_URL}/purchase-cancel`,
			payment_method_types: ["card"],
			discounts: coupon
				? [
						{
							coupon: await createStripeCoupon(stripe, coupon.discountPercentage),
						},
				  ]
				: [],
			metadata: {
				userId: req.user._id.toString(),
				checkoutId,
			},
			client_reference_id: req.user._id.toString(),
		});

		const payload = {
			userId: req.user._id.toString(),
			couponCode: coupon ? coupon.code : "",
			shippingAddressId: shippingAddressId || "",
			shippingAddress: addressResult.address,
			products: compactProducts,
		};
		await saveCheckoutPayload(checkoutId, payload);
		await saveCheckoutPayload(session.id, payload);

		if (totalAmount >= 20000) {
			await createNewCoupon(req.user._id);
		}

		res.status(200).json({
			id: session.id,
			url: session.url,
			totalAmount: totalAmount / 100,
		});
	} catch (error) {
		console.error("Error processing checkout:", error);
		res.status(500).json({ message: "Error processing checkout", error: error.message });
	}
};

export const mockCheckoutSession = async (req, res) => {
	try {
		const { products, couponCode, shippingAddress, shippingAddressId } = req.body;

		if (!Array.isArray(products) || products.length === 0) {
			return res.status(400).json({ error: "Invalid or empty products array" });
		}

		const addressResult = await resolveShippingAddress({
			userId: req.user._id,
			shippingAddress,
			shippingAddressId,
		});
		if (!addressResult.ok) {
			return res.status(400).json({ error: addressResult.message });
		}

		const stockResult = await reserveStockForProducts(products);
		if (!stockResult.ok) {
			return res.status(400).json({ error: stockResult.message });
		}

		let totalAmount = 0;
		const lineItems = products.map((product) => {
			const amount = Math.round(Number(product.price) * 100);
			totalAmount += amount * (product.quantity || 1);
			return {
				productId: product._id,
				quantity: product.quantity || 1,
				price: product.price,
				size: product.size || "",
				color: product.color || "",
				style: product.style || "",
			};
		});

		let coupon = null;
		if (couponCode) {
			coupon = await Coupon.findOne({
				code: String(couponCode).trim().toUpperCase(),
				isActive: true,
			});
			const orderSubtotalDollars = totalAmount / 100;
			if (coupon && isCouponApplicable(coupon, orderSubtotalDollars, req.user._id)) {
				totalAmount -= Math.round((totalAmount * coupon.discountPercentage) / 100);
			} else {
				coupon = null;
			}
		}

		if (totalAmount < 0) totalAmount = 0;
		const finalAmount = totalAmount / 100;
		const preDiscountAmount = lineItems.reduce(
			(sum, item) => sum + Number(item.price) * item.quantity,
			0
		);

		if (coupon) {
			await recordCouponUsage(coupon.code, req.user._id, preDiscountAmount);
		}

		const newOrder = new Order({
			user: req.user._id,
			products: lineItems.map((product) => ({
				product: product.productId,
				quantity: product.quantity,
				price: product.price,
				size: product.size || "",
				color: product.color || "",
				style: product.style || "",
			})),
			totalAmount: finalAmount,
			stripeSessionId: `MOCK-${Date.now()}`,
			paymentMethod: "mock",
			shippingAddress: addressResult.address,
			status: "processing",
			statusHistory: [
				{ status: "pending", note: "Order placed", changedAt: new Date() },
				{ status: "processing", note: "Payment successful", changedAt: new Date() },
			],
		});

		await newOrder.save();

		req.user.cartItems = [];
		await req.user.save();

		if (totalAmount >= 20000) {
			await createNewCoupon(req.user._id);
		}

		const populated = await populateNewOrder(newOrder._id);
		await sendOrderEmail(populated, "placed");

		res.status(200).json({
			success: true,
			orderId: newOrder._id,
			totalAmount: finalAmount,
			status: newOrder.status,
		});
	} catch (error) {
		console.error("Error processing mock checkout:", error);
		res.status(500).json({ message: "Error processing mock checkout", error: error.message });
	}
};

const quoteCheckout = async ({ products, couponCode, userId }) => {
	let totalAmount = 0;
	const lineItems = products.map((product) => {
		const amount = Math.round(Number(product.price) * 100);
		totalAmount += amount * (product.quantity || 1);
		return {
			productId: product._id || product.id,
			quantity: product.quantity || 1,
			price: product.price,
			size: product.size || "",
			color: product.color || "",
			style: product.style || "",
		};
	});

	let coupon = null;
	if (couponCode) {
		coupon = await Coupon.findOne({
			code: String(couponCode).trim().toUpperCase(),
			isActive: true,
		});
		if (!coupon || !isCouponApplicable(coupon, totalAmount / 100, userId)) {
			coupon = null;
		} else {
			totalAmount -= Math.round((totalAmount * coupon.discountPercentage) / 100);
		}
	}

	if (totalAmount < 0) totalAmount = 0;
	return { lineItems, totalAmount, coupon };
};

const placeLocalOrder = async ({
	user,
	lineItems,
	totalAmount,
	address,
	coupon,
	paymentMethod,
	stripeSessionId,
	razorpayOrderId = "",
	razorpayPaymentId = "",
	statusNote,
}) => {
	const preDiscountAmount = lineItems.reduce(
		(sum, item) => sum + Number(item.price) * item.quantity,
		0
	);
	if (coupon) {
		await recordCouponUsage(coupon.code, user._id, preDiscountAmount);
	}

	const newOrder = new Order({
		user: user._id,
		products: lineItems.map((product) => ({
			product: product.productId,
			quantity: product.quantity,
			price: product.price,
			size: product.size || "",
			color: product.color || "",
			style: product.style || "",
		})),
		totalAmount: totalAmount / 100,
		stripeSessionId,
		paymentMethod,
		razorpayOrderId,
		razorpayPaymentId,
		shippingAddress: address,
		status: "processing",
		statusHistory: [
			{ status: "pending", note: "Order placed", changedAt: new Date() },
			{ status: "processing", note: statusNote, changedAt: new Date() },
		],
	});
	await newOrder.save();
	user.cartItems = [];
	await user.save();
	if (totalAmount >= 20000) {
		await createNewCoupon(user._id);
	}
	const populated = await populateNewOrder(newOrder._id);
	await sendOrderEmail(populated, "placed");
	return newOrder;
};

export const cashOnDeliveryCheckout = async (req, res) => {
	try {
		const { products, couponCode, shippingAddress, shippingAddressId } = req.body;
		if (!Array.isArray(products) || products.length === 0) {
			return res.status(400).json({ error: "Invalid or empty products array" });
		}

		const addressResult = await resolveShippingAddress({
			userId: req.user._id,
			shippingAddress,
			shippingAddressId,
		});
		if (!addressResult.ok) {
			return res.status(400).json({ error: addressResult.message });
		}

		const stockResult = await reserveStockForProducts(products);
		if (!stockResult.ok) {
			return res.status(400).json({ error: stockResult.message });
		}

		const { lineItems, totalAmount, coupon } = await quoteCheckout({
			products,
			couponCode,
			userId: req.user._id,
		});

		const newOrder = await placeLocalOrder({
			user: req.user,
			lineItems,
			totalAmount,
			address: addressResult.address,
			coupon,
			paymentMethod: "cod",
			stripeSessionId: `COD-${Date.now()}-${crypto.randomUUID()}`,
			statusNote: "Cash on delivery — collect payment at delivery",
		});

		res.status(200).json({
			success: true,
			orderId: newOrder._id,
			totalAmount: newOrder.totalAmount,
			status: newOrder.status,
			paymentMethod: "cod",
		});
	} catch (error) {
		console.error("Error processing COD checkout:", error);
		res.status(500).json({ message: "Error processing COD checkout", error: error.message });
	}
};

export const createRazorpayCheckout = async (req, res) => {
	try {
		if (!isRazorpayConfigured()) {
			return res.status(500).json({
				error:
					"Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET from https://dashboard.razorpay.com/app/keys",
			});
		}

		const { products, couponCode, shippingAddress, shippingAddressId } = req.body;
		if (!Array.isArray(products) || products.length === 0) {
			return res.status(400).json({ error: "Invalid or empty products array" });
		}

		const addressResult = await resolveShippingAddress({
			userId: req.user._id,
			shippingAddress,
			shippingAddressId,
		});
		if (!addressResult.ok) {
			return res.status(400).json({ error: addressResult.message });
		}

		const stockCheck = await validateStockAvailability(products);
		if (!stockCheck.ok) {
			return res.status(400).json({ error: stockCheck.message });
		}

		const { lineItems, totalAmount, coupon } = await quoteCheckout({
			products,
			couponCode,
			userId: req.user._id,
		});

		if (totalAmount < 100) {
			return res.status(400).json({ error: "Razorpay requires a minimum of ₹1" });
		}

		const rzpOrder = await createRazorpayOrder({
			amountPaise: totalAmount,
			receipt: `rcpt_${Date.now()}`.slice(0, 40),
			notes: { userId: req.user._id.toString() },
		});

		await saveCheckoutPayload(rzpOrder.id, {
			userId: req.user._id.toString(),
			couponCode: coupon ? coupon.code : "",
			shippingAddress: addressResult.address,
			shippingAddressId: shippingAddressId || "",
			products: lineItems.map((item) => ({
				id: item.productId,
				quantity: item.quantity,
				price: item.price,
				size: item.size,
				color: item.color,
				style: item.style,
			})),
			totalAmount,
		});

		res.status(200).json({
			keyId: process.env.RAZORPAY_KEY_ID.trim(),
			orderId: rzpOrder.id,
			amount: totalAmount,
			currency: "INR",
			name: "NOVA",
			prefill: {
				name: req.user.name || "",
				email: req.user.email || "",
			},
		});
	} catch (error) {
		console.error("Error creating Razorpay order:", error);
		res.status(500).json({ message: "Error creating Razorpay order", error: error.message });
	}
};

export const verifyRazorpayPayment = async (req, res) => {
	try {
		const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
		if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
			return res.status(400).json({ message: "Missing Razorpay payment fields" });
		}

		const valid = verifyRazorpaySignature({
			orderId: razorpay_order_id,
			paymentId: razorpay_payment_id,
			signature: razorpay_signature,
			secret: process.env.RAZORPAY_KEY_SECRET,
		});
		if (!valid) {
			return res.status(400).json({ message: "Invalid Razorpay signature" });
		}

		const existing = await Order.findOne({ stripeSessionId: `RZP-${razorpay_order_id}` });
		if (existing) {
			return res.status(200).json({
				success: true,
				already: true,
				orderId: existing._id,
				status: existing.status,
			});
		}

		const cart = await loadCheckoutPayload(razorpay_order_id);
		if (!cart?.products?.length) {
			return res.status(400).json({ message: "Checkout session expired. Please try again." });
		}

		const stockResult = await reserveStockForProducts(cart.products);
		if (!stockResult.ok) {
			return res.status(400).json({ error: stockResult.message });
		}

		let coupon = null;
		if (cart.couponCode) {
			coupon = await Coupon.findOne({ code: cart.couponCode, isActive: true });
		}

		const lineItems = cart.products.map((p) => ({
			productId: p.id,
			quantity: p.quantity,
			price: p.price,
			size: p.size || "",
			color: p.color || "",
			style: p.style || "",
		}));

		const newOrder = await placeLocalOrder({
			user: req.user,
			lineItems,
			totalAmount: cart.totalAmount,
			address: cart.shippingAddress,
			coupon,
			paymentMethod: "razorpay",
			stripeSessionId: `RZP-${razorpay_order_id}`,
			razorpayOrderId: razorpay_order_id,
			razorpayPaymentId: razorpay_payment_id,
			statusNote: "Paid via Razorpay",
		});

		await deleteCheckoutPayload(razorpay_order_id);

		res.status(200).json({
			success: true,
			orderId: newOrder._id,
			totalAmount: newOrder.totalAmount,
			status: newOrder.status,
			paymentMethod: "razorpay",
		});
	} catch (error) {
		console.error("Error verifying Razorpay payment:", error);
		res.status(500).json({
			message: "Error verifying Razorpay payment",
			error: error.message,
		});
	}
};

export const checkoutSuccess = async (req, res) => {
	try {
		const { sessionId } = req.body;
		if (!sessionId) {
			return res.status(400).json({ message: "sessionId is required" });
		}

		const stripe = getStripe();
		if (!stripe) {
			return res.status(500).json({ message: "Stripe is not configured" });
		}

		const session = await stripe.checkout.sessions.retrieve(sessionId);
		const result = await fulfillPaidCheckoutSession(session);

		if (!result.ok) {
			return res.status(result.status || 400).json({ message: result.message });
		}

		return res.status(200).json({
			success: true,
			message: result.already
				? "Order already created"
				: "Payment successful, order created, and coupon usage recorded if used.",
			orderId: result.order._id,
			status: result.order.status,
		});
	} catch (error) {
		console.error("Error processing successful checkout:", error);
		res.status(500).json({
			message: "Error processing successful checkout",
			error: error.message,
		});
	}
};

async function createStripeCoupon(stripe, discountPercentage) {
	const coupon = await stripe.coupons.create({
		percent_off: discountPercentage,
		duration: "once",
	});

	return coupon.id;
}

async function createNewCoupon(userId) {
	await Coupon.findOneAndDelete({
		userId,
		code: { $regex: /^GIFT/i },
	});

	const newCoupon = new Coupon({
		code: "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
		discountPercentage: 10,
		expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		userId: userId,
		maxUsage: 1,
	});

	await newCoupon.save();

	return newCoupon;
}
