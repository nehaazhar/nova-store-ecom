import { ArrowRight, CheckCircle, HandHeart, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCartStore } from "../stores/useCartStore";
import axios from "../lib/axios";
import Confetti from "react-confetti";

const PurchaseSuccessPage = () => {
	const [isProcessing, setIsProcessing] = useState(true);
	const { clearCart } = useCartStore();
	const [error, setError] = useState(null);
	const [orderId, setOrderId] = useState(null);
	const [searchParams] = useSearchParams();

	useEffect(() => {
		const clearBackendCart = async () => {
			try {
				await axios.delete("/cart");
			} catch (err) {
				console.error("Failed to clear backend cart:", err);
			}
		};

		const handleCheckoutSuccess = async (sessionId) => {
			try {
				const res = await axios.post("/payments/checkout-success", {
					sessionId,
				});
				setOrderId(res.data.orderId || null);
				await clearBackendCart();
				clearCart();
			} catch (err) {
				console.log(err);
				setError("Failed to finalize purchase. Please refresh and check your order history.");
			} finally {
				setIsProcessing(false);
			}
		};

		const handleMockSuccess = async () => {
			const mockOrderId = searchParams.get("orderId");
			if (mockOrderId) setOrderId(mockOrderId);
			try {
				await clearBackendCart();
			} catch (err) {
				console.error("Failed to clear backend cart:", err);
			}
			clearCart();
			setIsProcessing(false);
		};

		const sessionId = searchParams.get("session_id");
		const isMock = searchParams.get("mock") === "true";

		if (isMock) {
			handleMockSuccess();
			return;
		}

		if (sessionId) {
			handleCheckoutSuccess(sessionId);
		} else {
			setIsProcessing(false);
			setError("No session ID found in the URL");
		}
	}, [clearCart, searchParams]);

	if (isProcessing) return "Processing...";

	if (error) return `Error: ${error}`;

	const shortOrderId = orderId ? String(orderId).slice(-8).toUpperCase() : "—";

	return (
		<div className="h-screen flex items-center justify-center px-4">
			<Confetti
				width={window.innerWidth}
				height={window.innerHeight}
				gravity={0.1}
				style={{ zIndex: 99 }}
				numberOfPieces={700}
				recycle={false}
			/>

			<div className="max-w-md w-full bg-white rounded-lg shadow-xl overflow-hidden relative z-10">
				<div className="p-6 sm:p-8">
					<div className="flex justify-center">
						<CheckCircle className="text-nova-accent w-16 h-16 mb-4" />
					</div>
					<h1 className="text-2xl sm:text-3xl font-bold text-center text-nova-accent mb-2">
						Purchase Successful!
					</h1>

					<p className="text-nova-muted text-center mb-2">
						Thank you for your order. {"We're"} processing it now.
					</p>
					<p className="text-nova-accent text-center text-sm mb-6">
						You can track status anytime from My Orders.
					</p>
					<div className="bg-nova-bg rounded-lg p-4 mb-6">
						<div className="flex items-center justify-between mb-2">
							<span className="text-sm text-nova-muted">Order number</span>
							<span className="text-sm font-semibold text-nova-accent">#{shortOrderId}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-nova-muted">Status</span>
							<span className="text-sm font-semibold text-yellow-400">Processing</span>
						</div>
					</div>

					<div className="space-y-4">
						<Link
							to="/orders"
							className="w-full bg-nova-accent hover:bg-nova-accent-dark text-white font-bold py-2 px-4
             rounded-lg transition duration-300 flex items-center justify-center"
						>
							<Package className="mr-2" size={18} />
							View My Orders
						</Link>
						<Link
							to="/"
							className="w-full bg-nova-bg hover:bg-nova-glow text-nova-accent font-bold py-2 px-4 
            rounded-lg transition duration-300 flex items-center justify-center"
						>
							Continue Shopping
							<ArrowRight className="ml-2" size={18} />
						</Link>
						<p className="text-center text-xs text-nova-muted flex items-center justify-center gap-1">
							<HandHeart size={14} /> Thanks for trusting us!
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PurchaseSuccessPage;
