import Order, { ORDER_STATUSES, ORDER_STATUS_FLOW } from "../models/order.model.js";
import User from "../models/user.model.js";
import { restoreStockForProducts } from "../utils/inventory.utils.js";
import { sendOrderEmail, sendEmail, isEmailConfigured } from "../utils/email.utils.js";
import { normalizeAddress } from "../controllers/address.controller.js";
import { refundPaidOrder } from "../utils/refund.utils.js";

const populateOrder = (query) =>
	query
		.populate("user", "name email")
		.populate("products.product", "name category price images image");

const maybeRestoreStock = async (order) => {
	if (order.stockRestored || order.stockReservationFailed) return;
	await restoreStockForProducts(order.products || []);
	order.stockRestored = true;
};

const maybeRefundOrder = async (order, note) => {
	const result = await refundPaidOrder(order);
	if (!result.ok) {
		order.refundStatus = "failed";
		order.refundNote = result.message || "Refund failed";
		return result;
	}
	order.statusHistory.push({
		status: order.status,
		note:
			note ||
			(result.skipped ? "Cancelled (no online charge)" : "Razorpay refund issued"),
		changedAt: new Date(),
	});
	return result;
};

export const resolveShippingAddress = async ({ userId, shippingAddress, shippingAddressId }) => {
	if (shippingAddressId) {
		const user = await User.findById(userId);
		const saved = user?.addresses?.id(shippingAddressId);
		if (!saved) {
			return { ok: false, message: "Selected shipping address not found" };
		}
		const { _id, isDefault, ...rest } = saved.toObject();
		return { ok: true, address: rest };
	}

	if (shippingAddress) {
		const parsed = normalizeAddress(shippingAddress);
		if (!parsed.ok) return parsed;
		const { isDefault, ...rest } = parsed.address;
		return { ok: true, address: rest };
	}

	const user = await User.findById(userId);
	const fallback =
		user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0] || null;
	if (!fallback) {
		return {
			ok: false,
			message: "Please add a shipping address before checkout",
		};
	}
	const { _id, isDefault, ...rest } = fallback.toObject();
	return { ok: true, address: rest };
};

export const getAllOrders = async (req, res) => {
	try {
		const { status = "all", search = "", returnStatus = "all" } = req.query;
		const query = {};

		if (status !== "all" && ORDER_STATUSES.includes(status)) {
			query.status = status;
		}
		if (returnStatus !== "all") {
			query["returnRequest.status"] = returnStatus;
		}

		let orders = await populateOrder(Order.find(query).sort({ createdAt: -1 }));

		if (search.trim()) {
			const term = search.trim().toLowerCase();
			orders = orders.filter(
				(order) =>
					order._id.toString().toLowerCase().includes(term) ||
					order.user?.email?.toLowerCase().includes(term) ||
					order.user?.name?.toLowerCase().includes(term)
			);
		}

		res.json({ orders });
	} catch (error) {
		console.log("Error in getAllOrders controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const getMyOrders = async (req, res) => {
	try {
		const { status = "all" } = req.query;
		const query = { user: req.user._id };

		if (status !== "all" && ORDER_STATUSES.includes(status)) {
			query.status = status;
		}

		const orders = await populateOrder(Order.find(query).sort({ createdAt: -1 }));
		res.json({ orders });
	} catch (error) {
		console.log("Error in getMyOrders controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const getOrderById = async (req, res) => {
	try {
		const order = await populateOrder(Order.findById(req.params.id));

		if (!order) {
			return res.status(404).json({ message: "Order not found" });
		}

		const isOwner = order.user?._id?.toString() === req.user._id.toString();
		const isAdmin = req.user.role === "admin";

		if (!isOwner && !isAdmin) {
			return res.status(403).json({ message: "Not authorized to view this order" });
		}

		res.json(order);
	} catch (error) {
		console.log("Error in getOrderById controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const updateOrderStatus = async (req, res) => {
	try {
		const { status, note = "" } = req.body;

		if (!ORDER_STATUSES.includes(status)) {
			return res.status(400).json({
				message: `Invalid order status. Allowed: ${ORDER_STATUSES.join(", ")}`,
			});
		}

		const order = await Order.findById(req.params.id);
		if (!order) {
			return res.status(404).json({ message: "Order not found" });
		}

		if (order.status === status) {
			const populated = await populateOrder(Order.findById(order._id));
			return res.json(populated);
		}

		const allowedNext = ORDER_STATUS_FLOW[order.status] || [];
		if (!allowedNext.includes(status)) {
			return res.status(400).json({
				message: `Cannot change status from "${order.status}" to "${status}". Allowed next: ${
					allowedNext.length ? allowedNext.join(", ") : "none"
				}`,
			});
		}

		order.status = status;
		order.statusHistory.push({
			status,
			note: note || `Status updated to ${status}`,
			changedAt: new Date(),
		});

		if (status === "cancelled") {
			const refundResult = await maybeRefundOrder(order, "Cancelled by admin — refund processed");
			if (!refundResult.ok) {
				return res.status(400).json({
					message: `Cannot cancel until refund succeeds: ${refundResult.message}`,
				});
			}
			await maybeRestoreStock(order);
		}

		await order.save();

		const populated = await populateOrder(Order.findById(order._id));
		if (["processing", "shipped", "delivered", "cancelled"].includes(status)) {
			await sendOrderEmail(populated, status);
		}

		res.json(populated);
	} catch (error) {
		console.log("Error in updateOrderStatus controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const cancelMyOrder = async (req, res) => {
	try {
		const order = await Order.findById(req.params.id);
		if (!order) {
			return res.status(404).json({ message: "Order not found" });
		}

		if (order.user.toString() !== req.user._id.toString()) {
			return res.status(403).json({ message: "Not authorized to cancel this order" });
		}

		const allowedNext = ORDER_STATUS_FLOW[order.status] || [];
		if (!allowedNext.includes("cancelled")) {
			return res.status(400).json({
				message: `This order cannot be cancelled because it is already "${order.status}".`,
			});
		}

		const refundResult = await maybeRefundOrder(order, "Cancelled by customer — refund processed");
		if (!refundResult.ok) {
			return res.status(400).json({
				message: `Cannot cancel until refund succeeds: ${refundResult.message}`,
			});
		}

		order.status = "cancelled";
		order.statusHistory.push({
			status: "cancelled",
			note: "Cancelled by customer",
			changedAt: new Date(),
		});
		await maybeRestoreStock(order);
		await order.save();

		const populated = await populateOrder(Order.findById(order._id));
		await sendOrderEmail(populated, "cancelled");
		res.json(populated);
	} catch (error) {
		console.log("Error in cancelMyOrder controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const requestReturn = async (req, res) => {
	try {
		const { reason = "" } = req.body;
		const order = await Order.findById(req.params.id);

		if (!order) {
			return res.status(404).json({ message: "Order not found" });
		}
		if (order.user.toString() !== req.user._id.toString()) {
			return res.status(403).json({ message: "Not authorized" });
		}
		if (order.status !== "delivered") {
			return res.status(400).json({
				message: "Return can only be requested after delivery",
			});
		}
		if (["requested", "approved"].includes(order.returnRequest?.status)) {
			return res.status(400).json({
				message: `Return already ${order.returnRequest.status}`,
			});
		}
		if (!String(reason).trim()) {
			return res.status(400).json({ message: "Please provide a return reason" });
		}

		order.returnRequest = {
			status: "requested",
			reason: String(reason).trim(),
			adminNote: "",
			requestedAt: new Date(),
			resolvedAt: undefined,
		};
		order.statusHistory.push({
			status: order.status,
			note: `Return requested: ${String(reason).trim()}`,
			changedAt: new Date(),
		});
		await order.save();

		const populated = await populateOrder(Order.findById(order._id));
		await sendOrderEmail(populated, "return_requested");
		res.json(populated);
	} catch (error) {
		console.log("Error in requestReturn", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const resolveReturn = async (req, res) => {
	try {
		const { status, adminNote = "" } = req.body;
		if (!["approved", "rejected"].includes(status)) {
			return res.status(400).json({
				message: 'status must be "approved" or "rejected"',
			});
		}

		const order = await Order.findById(req.params.id);
		if (!order) {
			return res.status(404).json({ message: "Order not found" });
		}
		if (order.returnRequest?.status !== "requested") {
			return res.status(400).json({
				message: "No pending return request for this order",
			});
		}

		order.returnRequest.status = status;
		order.returnRequest.adminNote = String(adminNote || "").trim();
		order.returnRequest.resolvedAt = new Date();
		order.statusHistory.push({
			status: order.status,
			note: `Return ${status}${adminNote ? `: ${adminNote}` : ""}`,
			changedAt: new Date(),
		});

		if (status === "approved") {
			const refundResult = await maybeRefundOrder(order, "Return approved — refund processed");
			if (!refundResult.ok) {
				return res.status(400).json({
					message: `Cannot approve return until refund succeeds: ${refundResult.message}`,
				});
			}
			await maybeRestoreStock(order);
		}

		await order.save();

		const populated = await populateOrder(Order.findById(order._id));
		await sendOrderEmail(
			populated,
			status === "approved" ? "return_approved" : "return_rejected"
		);
		res.json(populated);
	} catch (error) {
		console.log("Error in resolveReturn", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const sendSmtpTestEmail = async (req, res) => {
	try {
		if (!isEmailConfigured()) {
			return res.status(500).json({
				message:
					"Gmail SMTP Render pe usually block hota hai. Render Environment mein RESEND_API_KEY (https://resend.com) add karke redeploy karo.",
			});
		}

		const to = req.user.email;
		const result = await sendEmail({
			to,
			subject: "NOVA SMTP test",
			text: "If you received this, order emails can send from Render. Check Spam if you missed earlier order mails.",
			html: "<p>If you received this, SMTP is working on Render.</p><p>Check Spam/Promotions for order emails.</p>",
		});

		if (!result.ok) {
			return res.status(500).json({
				message: result.error || "Gmail rejected the message",
				mocked: result.mocked || false,
			});
		}

		res.json({
			ok: true,
			to,
			via: result.via || "unknown",
			message: `Test email sent to ${to}. Check inbox and Spam. Resend Logs mein bhi dekho.`,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
