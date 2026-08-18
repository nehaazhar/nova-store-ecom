import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useCartStore } from "../stores/useCartStore";

const GiftCouponCard = () => {
	const [userInputCode, setUserInputCode] = useState("");
	const {
		coupon,
		availableCoupon,
		isCouponApplied,
		applyCoupon,
		getMyCoupon,
		removeCoupon,
	} = useCartStore();

	useEffect(() => {
		getMyCoupon();
	}, [getMyCoupon]);

	const handleApplyCoupon = () => {
		if (!userInputCode.trim()) return;
		applyCoupon(userInputCode.trim().toUpperCase());
	};

	const handleRemoveCoupon = () => {
		removeCoupon();
		setUserInputCode("");
	};

	const handleUseAvailable = () => {
		if (!availableCoupon?.code) return;
		setUserInputCode(availableCoupon.code);
		applyCoupon(availableCoupon.code);
	};

	return (
		<motion.div
			className="nova-card space-y-4 p-5 sm:p-6"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, delay: 0.2 }}
		>
			<div className="space-y-4">
				<div>
					<label htmlFor="voucher" className="mb-2 block text-sm font-medium text-nova-ink">
						Do you have a voucher or gift card?
					</label>
					<input
						type="text"
						id="voucher"
						className="nova-input"
						placeholder="Enter code here (e.g. FREEDOM2026)"
						value={userInputCode}
						onChange={(e) => setUserInputCode(e.target.value.toUpperCase())}
					/>
				</div>

				<motion.button
					type="button"
					className="nova-btn w-full"
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={handleApplyCoupon}
				>
					Apply Code
				</motion.button>
			</div>

			{isCouponApplied && coupon && (
				<div className="mt-4">
					<h3 className="text-lg font-medium text-nova-muted">Applied Coupon</h3>
					<p className="mt-2 text-sm text-nova-muted">
						{coupon.code} - {coupon.discountPercentage}% off
					</p>

					<motion.button
						type="button"
						className="mt-2 flex w-full items-center justify-center rounded-lg bg-red-600 
            px-5 py-2.5 text-sm font-medium text-nova-ink hover:bg-red-700 focus:outline-none
             focus:ring-4 focus:ring-red-300"
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={handleRemoveCoupon}
					>
						Remove Coupon
					</motion.button>
				</div>
			)}

			{availableCoupon && !isCouponApplied && (
				<div className="mt-4">
					<h3 className="text-lg font-medium text-nova-muted">Your Available Coupon:</h3>
					<p className="mt-2 text-sm text-nova-muted">
						{availableCoupon.code} - {availableCoupon.discountPercentage}% off
					</p>
					<button
						type="button"
						onClick={handleUseAvailable}
						className="mt-2 text-sm text-nova-accent hover:text-nova-accent underline"
					>
						Apply this coupon
					</button>
				</div>
			)}
		</motion.div>
	);
};

export default GiftCouponCard;
