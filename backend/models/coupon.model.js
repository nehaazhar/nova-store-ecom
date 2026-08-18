import mongoose from "mongoose";

const usageHistorySchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		usedAt: {
			type: Date,
			default: Date.now,
		},
		orderAmount: {
			type: Number,
			default: 0,
		},
		discountAmount: {
			type: Number,
			default: 0,
		},
	},
	{ _id: true }
);

const couponSchema = new mongoose.Schema(
	{
		code: {
			type: String,
			required: true,
			unique: true,
			uppercase: true,
			trim: true,
		},
		discountPercentage: {
			type: Number,
			required: true,
			min: 0,
			max: 100,
		},
		expirationDate: {
			type: Date,
			required: true,
		},
		minOrderAmount: {
			type: Number,
			default: 0,
			min: 0,
		},
		maxUsage: {
			type: Number,
			default: 1,
			min: 1,
		},
		usageCount: {
			type: Number,
			default: 0,
			min: 0,
		},
		usedBy: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
			},
		],
		usageHistory: [usageHistorySchema],
		isActive: {
			type: Boolean,
			default: true,
		},
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
	},
	{
		timestamps: true,
	}
);

const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;
