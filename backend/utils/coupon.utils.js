export const getCouponRejectionReason = (coupon, subtotal, userId = null) => {
	if (!coupon) {
		return "Coupon code not found. Please check the code and try again.";
	}

	if (!coupon.isActive) {
		return "This coupon is inactive and can no longer be used.";
	}

	// Personal gift coupons are tied to a specific user
	if (
		userId &&
		coupon.userId &&
		String(coupon.code || "").startsWith("GIFT") &&
		coupon.userId.toString() !== userId.toString()
	) {
		return "This coupon is not available for your account.";
	}

	if (!coupon.expirationDate || new Date(coupon.expirationDate) < new Date()) {
		return "This coupon has expired.";
	}

	const orderSubtotal = Number(subtotal ?? 0);
	const minOrder = Number(coupon.minOrderAmount || 0);
	if (minOrder > 0 && orderSubtotal < minOrder) {
		const shortfall = (minOrder - orderSubtotal).toFixed(2);
		return `Minimum order amount of $${minOrder.toFixed(2)} required. Add $${shortfall} more to use this coupon.`;
	}

	if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
		return "This coupon has reached its maximum usage limit.";
	}

	if (userId && Array.isArray(coupon.usedBy)) {
		const alreadyUsed = coupon.usedBy.some(
			(id) => id?.toString() === userId.toString()
		);
		if (alreadyUsed) {
			return "You have already used this coupon.";
		}
	}

	return null;
};

export const isCouponApplicable = (coupon, subtotal, userId = null) => {
	return getCouponRejectionReason(coupon, subtotal, userId) === null;
};

export const calculateDiscountedAmount = (subtotal, coupon, userId = null) => {
	if (!isCouponApplicable(coupon, subtotal, userId)) return subtotal;
	const discountAmount = subtotal * (coupon.discountPercentage / 100);
	return Math.round((subtotal - discountAmount) * 100) / 100;
};

export const validateCouponPayload = ({
	code,
	discountPercentage,
	expirationDate,
	minOrderAmount,
	maxUsage,
}) => {
	const errors = [];

	if (!code || typeof code !== "string" || !code.trim()) {
		errors.push("Coupon code is required.");
	} else if (!/^[A-Z0-9_-]{3,20}$/i.test(code.trim())) {
		errors.push("Coupon code must be 3–20 characters (letters, numbers, _ or -).");
	}

	const discount = Number(discountPercentage);
	if (Number.isNaN(discount)) {
		errors.push("Discount percentage is required.");
	} else if (discount < 1 || discount > 100) {
		errors.push("Discount percentage must be between 1 and 100.");
	}

	if (!expirationDate) {
		errors.push("Expiration date is required.");
	} else {
		const expiry = new Date(expirationDate);
		if (Number.isNaN(expiry.getTime())) {
			errors.push("Expiration date is invalid.");
		} else {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			if (expiry < today) {
				errors.push("Expiration date must be today or a future date.");
			}
		}
	}

	if (minOrderAmount !== undefined && minOrderAmount !== "" && minOrderAmount !== null) {
		const minOrder = Number(minOrderAmount);
		if (Number.isNaN(minOrder) || minOrder < 0) {
			errors.push("Minimum order amount cannot be negative.");
		}
	}

	if (maxUsage !== undefined && maxUsage !== "" && maxUsage !== null) {
		const usage = Number(maxUsage);
		if (Number.isNaN(usage) || usage < 1 || !Number.isInteger(usage)) {
			errors.push("Max usage must be a whole number of at least 1.");
		}
	}

	return errors;
};

export const getCouponStatus = (coupon) => {
	const now = new Date();
	if (!coupon.isActive) return "inactive";
	if (coupon.expirationDate && new Date(coupon.expirationDate) < now) return "expired";
	if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) return "exhausted";
	return "active";
};
