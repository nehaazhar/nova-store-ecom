import mongoose from "mongoose";

export const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

export const ORDER_STATUS_FLOW = {
	pending: ["processing", "cancelled"],
	processing: ["shipped", "cancelled"],
	shipped: ["delivered"],
	delivered: [],
	cancelled: [],
};

export const RETURN_STATUSES = ["none", "requested", "approved", "rejected"];

const statusHistorySchema = new mongoose.Schema(
	{
		status: {
			type: String,
			enum: ORDER_STATUSES,
			required: true,
		},
		note: {
			type: String,
			default: "",
		},
		changedAt: {
			type: Date,
			default: Date.now,
		},
	},
	{ _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
	{
		fullName: { type: String, required: true },
		phone: { type: String, required: true },
		line1: { type: String, required: true },
		line2: { type: String, default: "" },
		city: { type: String, required: true },
		state: { type: String, required: true },
		postalCode: { type: String, required: true },
		country: { type: String, required: true, default: "India" },
	},
	{ _id: false }
);

const returnRequestSchema = new mongoose.Schema(
	{
		status: {
			type: String,
			enum: RETURN_STATUSES,
			default: "none",
		},
		reason: { type: String, default: "" },
		adminNote: { type: String, default: "" },
		requestedAt: { type: Date },
		resolvedAt: { type: Date },
	},
	{ _id: false }
);

const orderSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		products: [
			{
				product: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "Product",
					required: true,
				},
				quantity: {
					type: Number,
					required: true,
					min: 1,
				},
				price: {
					type: Number,
					required: true,
					min: 0,
				},
				size: { type: String, default: "" },
				color: { type: String, default: "" },
				style: { type: String, default: "" },
			},
		],
		totalAmount: {
			type: Number,
			required: true,
			min: 0,
		},
		stripeSessionId: {
			type: String,
			unique: true,
			sparse: true,
		},
		paymentMethod: {
			type: String,
			enum: ["stripe", "razorpay", "cod", "mock"],
			default: "stripe",
		},
		razorpayOrderId: {
			type: String,
			default: "",
		},
		razorpayPaymentId: {
			type: String,
			default: "",
		},
		stripePaymentIntentId: {
			type: String,
			default: "",
		},
		stripeRefundId: {
			type: String,
			default: "",
		},
		refundStatus: {
			type: String,
			enum: ["none", "pending", "refunded", "failed"],
			default: "none",
		},
		refundNote: {
			type: String,
			default: "",
		},
		stockReservationFailed: {
			type: Boolean,
			default: false,
		},
		shippingAddress: {
			type: shippingAddressSchema,
			required: false,
		},
		status: {
			type: String,
			enum: ORDER_STATUSES,
			default: "pending",
		},
		statusHistory: {
			type: [statusHistorySchema],
			default: [],
		},
		stockRestored: {
			type: Boolean,
			default: false,
		},
		returnRequest: {
			type: returnRequestSchema,
			default: () => ({ status: "none" }),
		},
	},
	{ timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ stripePaymentIntentId: 1 });

orderSchema.pre("save", function (next) {
	if (this.isNew && (!this.statusHistory || this.statusHistory.length === 0)) {
		this.statusHistory = [
			{
				status: this.status || "pending",
				note: "Order created",
				changedAt: new Date(),
			},
		];
	}
	next();
});

const Order = mongoose.model("Order", orderSchema);

export default Order;
