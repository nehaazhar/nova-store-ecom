import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useCartStore } from "../stores/useCartStore";
import { useAddressStore } from "../stores/useAddressStore";
import { Link } from "react-router-dom";
import { Loader2, MoveRight } from "lucide-react";
import axios from "../lib/axios";
import toast from "react-hot-toast";

const loadRazorpayScript = () =>
	new Promise((resolve) => {
		if (window.Razorpay) {
			resolve(true);
			return;
		}
		const script = document.createElement("script");
		script.src = "https://checkout.razorpay.com/v1/checkout.js";
		script.onload = () => resolve(true);
		script.onerror = () => resolve(false);
		document.body.appendChild(script);
	});

const OrderSummary = () => {
	const { total, subtotal, coupon, isCouponApplied, cart } = useCartStore();
	const { selectedAddressId, getSelectedAddress } = useAddressStore();
	const forceMock = import.meta.env.VITE_USE_MOCK_CHECKOUT === "true";
	const [paying, setPaying] = useState(false);
	const [config, setConfig] = useState({ gateway: "none", razorpay: false });
	const [checking, setChecking] = useState(true);
	const [apiDown, setApiDown] = useState(false);

	useEffect(() => {
		let cancelled = false;
		const loadConfig = async () => {
			try {
				const res = await axios.get("/payments/config");
				if (!cancelled) {
					setApiDown(false);
					setConfig(res.data || { gateway: "none" });
				}
			} catch {
				if (!cancelled) {
					setApiDown(true);
					setConfig({ gateway: "none" });
				}
			} finally {
				if (!cancelled) setChecking(false);
			}
		};
		loadConfig();
		return () => {
			cancelled = true;
		};
	}, []);

	const savings = subtotal - total;
	const formattedSubtotal = subtotal.toFixed(2);
	const formattedTotal = total.toFixed(2);
	const formattedSavings = savings.toFixed(2);
	const appliedCouponCode = isCouponApplied && coupon ? coupon.code : null;
	const onlineGateway = forceMock ? "none" : config.gateway;

	const checkoutPayload = () => ({
		products: cart,
		couponCode: appliedCouponCode,
		shippingAddressId: selectedAddressId,
		shippingAddress: getSelectedAddress(),
	});

	const handleCod = async () => {
		if (paying) return;
		if (!selectedAddressId) {
			toast.error("Please select or add a shipping address");
			return;
		}
		setPaying(true);
		try {
			const res = await axios.post("/payments/cod-checkout", checkoutPayload());
			toast.success("Order placed (Cash on Delivery)");
			window.location.href = `/purchase-success?mock=true&orderId=${res.data.orderId}`;
		} catch (error) {
			toast.error(
				error.response?.data?.error ||
					error.response?.data?.message ||
					"COD checkout failed"
			);
			setPaying(false);
		}
	};

	const handleRazorpay = async () => {
		const ok = await loadRazorpayScript();
		if (!ok) {
			toast.error("Could not load Razorpay checkout");
			setPaying(false);
			return;
		}

		const orderRes = await axios.post("/payments/razorpay/order", checkoutPayload());
		const { keyId, orderId, amount, currency, name, prefill } = orderRes.data;

		await new Promise((resolve, reject) => {
			const rzp = new window.Razorpay({
				key: keyId,
				amount,
				currency,
				name,
				description: "NOVA order",
				order_id: orderId,
				prefill,
				theme: { color: "#0f766e" },
				handler: async (response) => {
					try {
						const verify = await axios.post("/payments/razorpay/verify", response);
						window.location.href = `/purchase-success?mock=true&orderId=${verify.data.orderId}`;
						resolve();
					} catch (error) {
						reject(error);
					}
				},
				modal: {
					ondismiss: () => reject(new Error("Payment cancelled")),
				},
			});
			rzp.on("payment.failed", (resp) => {
				reject(new Error(resp?.error?.description || "Payment failed"));
			});
			rzp.open();
		});
	};

	const handlePayment = async () => {
		if (paying) return;
		if (!selectedAddressId) {
			toast.error("Please select or add a shipping address");
			return;
		}

		setPaying(true);
		try {
			if (onlineGateway === "razorpay") {
				await handleRazorpay();
				return;
			}

			const res = await axios.post("/payments/mock-checkout", checkoutPayload());
			toast.success("Payment successful! Redirecting...");
			window.location.href = `/purchase-success?mock=true&orderId=${res.data.orderId}`;
		} catch (error) {
			toast.error(
				error.response?.data?.error ||
					error.response?.data?.message ||
					error.message ||
					"Checkout failed"
			);
			setPaying(false);
		}
	};

	const onlineLabel =
		onlineGateway === "razorpay"
			? "Pay with Razorpay (UPI / Card)"
			: "Proceed with Dummy Payment";

	return (
		<motion.div
			className="nova-card space-y-4 p-5 sm:p-6"
			initial={{ opacity: 0, y: 16 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
		>
			<p className="font-display text-xl font-bold text-nova-ink">Order summary</p>

			<div className="space-y-4">
				<div className="space-y-2">
					<dl className="flex items-center justify-between gap-4">
						<dt className="text-sm text-nova-muted">Original price</dt>
						<dd className="text-sm font-medium text-nova-ink">₹{formattedSubtotal}</dd>
					</dl>

					{savings > 0 && (
						<dl className="flex items-center justify-between gap-4">
							<dt className="text-sm text-nova-muted">Savings</dt>
							<dd className="text-sm font-medium text-nova-accent">
								-₹{formattedSavings}
							</dd>
						</dl>
					)}

					{coupon && isCouponApplied && (
						<dl className="flex items-center justify-between gap-4">
							<dt className="text-sm text-nova-muted">Coupon ({coupon.code})</dt>
							<dd className="text-sm font-medium text-nova-accent">
								-{coupon.discountPercentage}%
							</dd>
						</dl>
					)}
					<dl className="flex items-center justify-between gap-4 border-t border-nova-line pt-3">
						<dt className="font-semibold text-nova-ink">Total</dt>
						<dd className="font-display text-xl font-bold text-nova-ink">
							₹{formattedTotal}
						</dd>
					</dl>
				</div>

				<button
					type="button"
					className="nova-btn w-full py-3"
					onClick={handlePayment}
					disabled={!selectedAddressId || paying || checking}
				>
					{paying || checking ? (
						<>
							<Loader2 className="h-4 w-4 animate-spin" />
							{checking ? "Checking payment..." : "Processing payment..."}
						</>
					) : (
						onlineLabel
					)}
				</button>

				<button
					type="button"
					className="nova-btn-outline w-full py-3"
					onClick={handleCod}
					disabled={!selectedAddressId || paying || checking}
				>
					Cash on Delivery
				</button>

				{onlineGateway === "razorpay" && (
					<p className="text-center text-xs text-nova-muted">
						Razorpay test: UPI / card. Success card often 4111 1111 1111 1111
					</p>
				)}
				{apiDown && !checking && (
					<p className="text-center text-xs text-amber-600">
						Backend API band hai (http://localhost:5000). Project root mein `npm run
						dev` chalao, phir page refresh karo.
					</p>
				)}
				{onlineGateway === "none" && !checking && !apiDown && (
					<p className="text-center text-xs text-amber-600">
						Razorpay keys nahi mili — Dummy ya Cash on Delivery use karo. Root .env mein
						RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET add karke server restart karo.
					</p>
				)}

				{!selectedAddressId && (
					<p className="text-center text-xs text-amber-600">
						Select a shipping address above
					</p>
				)}

				<div className="flex items-center justify-center gap-2">
					<span className="text-sm text-nova-muted">or</span>
					<Link
						to="/shop"
						className="inline-flex items-center gap-2 text-sm font-semibold text-nova-accent hover:underline"
					>
						Continue Shopping
						<MoveRight size={16} />
					</Link>
				</div>
			</div>
		</motion.div>
	);
};

export default OrderSummary;
