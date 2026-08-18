import Coupon from "../models/coupon.model.js";
import {
	isCouponApplicable,
	calculateDiscountedAmount,
	getCouponRejectionReason,
	validateCouponPayload,
	getCouponStatus,
} from "../utils/coupon.utils.js";

const buildAdminCouponQuery = ({ search = "", status = "all" }) => {
	const query = {};
	const now = new Date();

	if (search.trim()) {
		query.code = { $regex: search.trim(), $options: "i" };
	}

	switch (status) {
		case "active":
			query.isActive = true;
			query.expirationDate = { $gte: now };
			query.$expr = { $lt: ["$usageCount", "$maxUsage"] };
			break;
		case "inactive":
			query.isActive = false;
			break;
		case "expired":
			query.expirationDate = { $lt: now };
			break;
		case "exhausted":
			query.$expr = { $gte: ["$usageCount", "$maxUsage"] };
			break;
		default:
			break;
	}

	return query;
};

export const getAdminCoupons = async (req, res) => {
	try {
		const { search = "", status = "all" } = req.query;
		const query = buildAdminCouponQuery({ search, status });

		const coupons = await Coupon.find(query)
			.sort({ createdAt: -1 })
			.populate("usedBy", "name email")
			.populate("usageHistory.user", "name email")
			.populate("userId", "name email");

		const couponsWithStatus = coupons.map((coupon) => {
			const obj = coupon.toObject();
			obj.status = getCouponStatus(coupon);
			return obj;
		});

		res.json(couponsWithStatus);
	} catch (error) {
		console.log("Error in getAdminCoupons controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const getCouponStats = async (req, res) => {
	try {
		const now = new Date();
		const coupons = await Coupon.find({});

		const stats = {
			total: coupons.length,
			active: 0,
			inactive: 0,
			expired: 0,
			exhausted: 0,
			totalRedemptions: 0,
			totalDiscountGiven: 0,
		};

		for (const coupon of coupons) {
			const status = getCouponStatus(coupon);
			if (status === "active") stats.active += 1;
			else if (status === "inactive") stats.inactive += 1;
			else if (status === "expired") stats.expired += 1;
			else if (status === "exhausted") stats.exhausted += 1;

			stats.totalRedemptions += coupon.usageCount || 0;
			stats.totalDiscountGiven += (coupon.usageHistory || []).reduce(
				(sum, entry) => sum + (entry.discountAmount || 0),
				0
			);
		}

		// Ensure expired that are also inactive aren't double-counted oddly:
		// getCouponStatus already prioritizes inactive over expired.
		res.json({
			...stats,
			totalDiscountGiven: Math.round(stats.totalDiscountGiven * 100) / 100,
			asOf: now,
		});
	} catch (error) {
		console.log("Error in getCouponStats controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const getCouponUsageHistory = async (req, res) => {
	try {
		const { search = "", limit = 50 } = req.query;
		const query = search.trim()
			? { code: { $regex: search.trim(), $options: "i" } }
			: {};

		const coupons = await Coupon.find(query)
			.select("code discountPercentage usageHistory usageCount")
			.populate("usageHistory.user", "name email")
			.sort({ updatedAt: -1 });

		const history = [];
		for (const coupon of coupons) {
			for (const entry of coupon.usageHistory || []) {
				history.push({
					couponId: coupon._id,
					code: coupon.code,
					discountPercentage: coupon.discountPercentage,
					user: entry.user,
					usedAt: entry.usedAt,
					orderAmount: entry.orderAmount,
					discountAmount: entry.discountAmount,
				});
			}
		}

		history.sort((a, b) => new Date(b.usedAt) - new Date(a.usedAt));

		res.json(history.slice(0, Number(limit) || 50));
	} catch (error) {
		console.log("Error in getCouponUsageHistory controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const createCoupon = async (req, res) => {
	try {
		const { code, discountPercentage, expirationDate, minOrderAmount, maxUsage } = req.body;

		const validationErrors = validateCouponPayload({
			code,
			discountPercentage,
			expirationDate,
			minOrderAmount,
			maxUsage,
		});
		if (validationErrors.length > 0) {
			return res.status(400).json({
				message: validationErrors[0],
				errors: validationErrors,
			});
		}

		const normalizedCode = code.trim().toUpperCase();
		const existingCoupon = await Coupon.findOne({ code: normalizedCode });
		if (existingCoupon) {
			return res.status(400).json({
				message: `Coupon code "${normalizedCode}" already exists. Please choose a different code.`,
			});
		}

		const coupon = await Coupon.create({
			code: normalizedCode,
			discountPercentage: Number(discountPercentage),
			expirationDate: new Date(expirationDate),
			minOrderAmount: Number(minOrderAmount || 0),
			maxUsage: Number(maxUsage || 1),
			userId: req.user._id,
		});

		res.status(201).json(coupon);
	} catch (error) {
		console.log("Error in createCoupon controller", error.message);
		if (error.code === 11000) {
			const field = Object.keys(error.keyPattern || {})[0];
			if (field === "userId") {
				return res.status(400).json({
					message:
						"A legacy database restriction blocked this coupon. Restart the server once and try again.",
				});
			}
			return res.status(400).json({
				message: `Coupon code "${String(req.body.code || "").trim().toUpperCase()}" already exists. Please choose a different code.`,
			});
		}
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const toggleCouponStatus = async (req, res) => {
	try {
		const coupon = await Coupon.findById(req.params.id);
		if (!coupon) {
			return res.status(404).json({ message: "Coupon not found." });
		}

		coupon.isActive = !coupon.isActive;
		await coupon.save();
		const obj = coupon.toObject();
		obj.status = getCouponStatus(coupon);
		res.json(obj);
	} catch (error) {
		console.log("Error in toggleCouponStatus controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const updateCoupon = async (req, res) => {
	try {
		const { code, discountPercentage, expirationDate, minOrderAmount, maxUsage, isActive } =
			req.body;
		const coupon = await Coupon.findById(req.params.id);
		if (!coupon) {
			return res.status(404).json({ message: "Coupon not found." });
		}

		const nextPayload = {
			code: code ?? coupon.code,
			discountPercentage:
				discountPercentage !== undefined ? discountPercentage : coupon.discountPercentage,
			expirationDate: expirationDate ?? coupon.expirationDate,
			minOrderAmount: minOrderAmount !== undefined ? minOrderAmount : coupon.minOrderAmount,
			maxUsage: maxUsage !== undefined ? maxUsage : coupon.maxUsage,
		};

		const validationErrors = validateCouponPayload(nextPayload);
		if (validationErrors.length > 0) {
			return res.status(400).json({
				message: validationErrors[0],
				errors: validationErrors,
			});
		}

		if (maxUsage !== undefined && Number(maxUsage) < coupon.usageCount) {
			return res.status(400).json({
				message: `Max usage cannot be less than current usage count (${coupon.usageCount}).`,
			});
		}

		const normalizedCode = String(nextPayload.code).trim().toUpperCase();
		if (normalizedCode !== coupon.code) {
			const existingCoupon = await Coupon.findOne({ code: normalizedCode });
			if (existingCoupon) {
				return res.status(400).json({
					message: `Coupon code "${normalizedCode}" already exists. Please choose a different code.`,
				});
			}
		}

		coupon.code = normalizedCode;
		coupon.discountPercentage = Number(nextPayload.discountPercentage);
		coupon.expirationDate = new Date(nextPayload.expirationDate);
		coupon.minOrderAmount = Number(nextPayload.minOrderAmount || 0);
		coupon.maxUsage = Number(nextPayload.maxUsage || 1);
		if (isActive !== undefined) coupon.isActive = isActive;

		await coupon.save();
		const obj = coupon.toObject();
		obj.status = getCouponStatus(coupon);
		res.json(obj);
	} catch (error) {
		console.log("Error in updateCoupon controller", error.message);
		if (error.code === 11000) {
			return res.status(400).json({ message: "Coupon code already exists." });
		}
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const deleteCoupon = async (req, res) => {
	try {
		const coupon = await Coupon.findByIdAndDelete(req.params.id);
		if (!coupon) {
			return res.status(404).json({ message: "Coupon not found." });
		}
		res.json({ message: "Coupon deleted successfully." });
	} catch (error) {
		console.log("Error in deleteCoupon controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const getCoupon = async (req, res) => {
	try {
		// Personal reward coupon for this user (gift codes), not admin campaign codes
		const coupon = await Coupon.findOne({
			userId: req.user._id,
			isActive: true,
			code: { $regex: /^GIFT/i },
		}).sort({ createdAt: -1 });

		res.json(coupon || null);
	} catch (error) {
		console.log("Error in getCoupon controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const validateCoupon = async (req, res) => {
	try {
		const { code, subtotal } = req.body;

		if (!code || !String(code).trim()) {
			return res.status(400).json({ message: "Please enter a coupon code." });
		}

		const normalizedCode = String(code).trim().toUpperCase();

		// Case-insensitive lookup so admin codes always match
		let coupon = await Coupon.findOne({
			code: { $regex: `^${normalizedCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
		});

		if (!coupon) {
			// Helpful hint when user mistypes a close code (e.g. FREEDOM2026 vs FREEDOM)
			const similar = await Coupon.findOne({
				code: { $regex: normalizedCode.slice(0, 4), $options: "i" },
				isActive: true,
			}).select("code");

			const hint = similar?.code
				? ` Did you mean "${similar.code}"?`
				: " Check Admin → Coupons for the exact code.";

			return res.status(404).json({
				message: `Coupon code "${normalizedCode}" not found.${hint}`,
			});
		}

		const orderSubtotal = Number(subtotal ?? 0);
		const rejectionReason = getCouponRejectionReason(coupon, orderSubtotal, req.user._id);

		if (rejectionReason) {
			if (coupon && coupon.expirationDate < new Date() && coupon.isActive) {
				coupon.isActive = false;
				await coupon.save();
			}
			return res.status(400).json({ message: rejectionReason });
		}

		// Preview only — actual redemption is recorded on successful checkout
		const discountedAmount = calculateDiscountedAmount(orderSubtotal, coupon, req.user._id);
		const discountAmount = Math.round((orderSubtotal - discountedAmount) * 100) / 100;

		res.json({
			message: `Coupon applied! You save $${discountAmount.toFixed(2)}.`,
			code: coupon.code,
			discountPercentage: coupon.discountPercentage,
			discountedAmount,
			discountAmount,
			minOrderAmount: coupon.minOrderAmount,
			maxUsage: coupon.maxUsage,
			usageCount: coupon.usageCount,
		});
	} catch (error) {
		console.log("Error in validateCoupon controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const recordCouponUsage = async (couponCode, userId, orderAmount = 0) => {
	if (!couponCode || !userId) return null;

	const coupon = await Coupon.findOne({ code: String(couponCode).trim().toUpperCase() });
	if (!coupon) return null;

	const discountAmount =
		Math.round(orderAmount * (coupon.discountPercentage / 100) * 100) / 100;

	coupon.usageCount += 1;
	coupon.usedBy.push(userId);
	coupon.usageHistory.push({
		user: userId,
		usedAt: new Date(),
		orderAmount,
		discountAmount,
	});

	if (coupon.usageCount >= coupon.maxUsage) {
		coupon.isActive = false;
	}

	await coupon.save();
	return coupon;
};
