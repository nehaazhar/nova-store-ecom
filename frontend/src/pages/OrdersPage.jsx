import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Truck, CheckCircle2, Clock3, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useOrderStore } from "../stores/useOrderStore";

const STATUS_FILTERS = ["all", "pending", "processing", "shipped", "delivered", "cancelled"];

const statusStyles = {
	pending: "bg-gray-600 text-white",
	processing: "bg-yellow-500 text-gray-900",
	shipped: "bg-blue-500 text-white",
	delivered: "bg-emerald-500 text-gray-900",
	cancelled: "bg-red-500 text-white",
};

const timelineSteps = ["pending", "processing", "shipped", "delivered"];

const getProductImage = (product) =>
	product?.images?.[0] || product?.image || "https://via.placeholder.com/80";

const OrdersPage = () => {
	const { myOrders, fetchMyOrders, cancelMyOrder, requestReturn, loading } = useOrderStore();
	const [statusFilter, setStatusFilter] = useState("all");
	const [expandedId, setExpandedId] = useState(null);

	useEffect(() => {
		fetchMyOrders({ status: statusFilter });
	}, [fetchMyOrders, statusFilter]);

	const handleCancel = async (orderId) => {
		if (!window.confirm("Cancel this order?")) return;
		await cancelMyOrder(orderId);
	};

	const handleReturn = async (orderId) => {
		const reason = window.prompt("Why do you want to return this order?");
		if (!reason?.trim()) return;
		await requestReturn(orderId, reason.trim());
	};

	const canCancel = (status) => status === "pending" || status === "processing";
	const canReturn = (order) =>
		order.status === "delivered" &&
		(!order.returnRequest?.status ||
			order.returnRequest.status === "none" ||
			order.returnRequest.status === "rejected");

	return (
		<div className="nova-container py-10">
			<div className="mx-auto max-w-5xl">
				<motion.div
					initial={{ opacity: 0, y: -12 }}
					animate={{ opacity: 1, y: 0 }}
					className="mb-8"
				>
					<p className="text-sm font-medium uppercase tracking-wider text-nova-accent">Account</p>
					<h1 className="mt-1 font-display text-3xl font-bold text-nova-ink">My Orders</h1>
					<p className="mt-1 text-nova-muted">Track deliveries and view order history</p>
				</motion.div>

				<div className="flex flex-wrap gap-2 mb-6">
					{STATUS_FILTERS.map((status) => (
						<button
							key={status}
							onClick={() => setStatusFilter(status)}
							className={`px-3 py-1.5 rounded-md text-sm capitalize transition ${
								statusFilter === status
									? "bg-nova-accent text-white"
									: "bg-white text-nova-muted hover:bg-nova-bg"
							}`}
						>
							{status}
						</button>
					))}
				</div>

				{loading && myOrders.length === 0 ? (
					<p className="text-nova-muted">Loading your orders...</p>
				) : myOrders.length === 0 ? (
					<div className="bg-white rounded-lg p-10 text-center">
						<Package className="mx-auto h-12 w-12 text-nova-muted mb-3" />
						<p className="text-nova-muted mb-4">No orders found.</p>
						<Link
							to="/"
							className="inline-block bg-nova-accent hover:bg-nova-accent-dark text-white px-4 py-2 rounded-md"
						>
							Start Shopping
						</Link>
					</div>
				) : (
					<div className="space-y-4">
						{myOrders.map((order) => {
							const expanded = expandedId === order._id;
							const history = order.statusHistory?.length
								? order.statusHistory
								: [{ status: order.status, changedAt: order.createdAt, note: "Order created" }];

							return (
								<motion.div
									key={order._id}
									className="bg-white rounded-lg border border-nova-line overflow-hidden"
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
								>
									<div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
										<div>
											<p className="text-sm text-nova-muted">
												Order ID:{" "}
												<span className="text-nova-ink font-mono">
													{order._id.slice(-8).toUpperCase()}
												</span>
											</p>
											<p className="text-sm text-nova-muted mt-1">
												Placed on {new Date(order.createdAt).toLocaleString()}
											</p>
											<p className="text-nova-accent font-semibold mt-2">
												₹{Number(order.totalAmount).toFixed(2)} · {order.products?.length || 0}{" "}
												item(s)
											</p>
										</div>

										<div className="flex items-center gap-3">
											<span
												className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
													statusStyles[order.status] || statusStyles.pending
												}`}
											>
												{order.status}
											</span>
											<button
												onClick={() => setExpandedId(expanded ? null : order._id)}
												className="text-sm text-nova-muted hover:text-nova-accent flex items-center gap-1"
											>
												{expanded ? "Hide" : "Details"}
												{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
											</button>
										</div>
									</div>

									{expanded && (
										<div className="border-t border-nova-line p-4 sm:p-5 space-y-5 bg-white/60">
											{/* Timeline */}
											{order.status !== "cancelled" && (
												<div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
													{timelineSteps.map((step, idx) => {
														const reachedIndex = timelineSteps.indexOf(
															order.status === "cancelled" ? "pending" : order.status
														);
														const done = idx <= reachedIndex;
														const Icon =
															step === "pending"
																? Clock3
																: step === "processing"
																	? Package
																	: step === "shipped"
																		? Truck
																		: CheckCircle2;
														return (
															<div key={step} className="flex items-center gap-2 min-w-0 flex-1">
																<div
																	className={`flex flex-col items-center text-center ${
																		done ? "text-nova-accent" : "text-nova-muted"
																	}`}
																>
																	<Icon size={20} />
																	<span className="text-[11px] capitalize mt-1">{step}</span>
																</div>
																{idx < timelineSteps.length - 1 && (
																	<div
																		className={`h-0.5 flex-1 ${
																			idx < reachedIndex ? "bg-emerald-500" : "bg-gray-600"
																		}`}
																	/>
																)}
															</div>
														);
													})}
												</div>
											)}

											{order.status === "cancelled" && (
												<div className="flex items-center gap-2 text-red-400 text-sm">
													<XCircle size={18} />
													Order cancelled
													{order.refundStatus === "refunded" && (
														<span className="text-emerald-600">· Refund issued</span>
													)}
												</div>
											)}

											{/* Shipping address */}
											{order.shippingAddress && (
												<div className="text-sm text-nova-muted bg-nova-bg/40 rounded-md p-3">
													<p className="font-semibold text-nova-ink mb-1">Shipping to</p>
													<p>{order.shippingAddress.fullName} · {order.shippingAddress.phone}</p>
													<p className="text-nova-muted">
														{order.shippingAddress.line1}
														{order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}
													</p>
													<p className="text-nova-muted">
														{order.shippingAddress.city}, {order.shippingAddress.state}{" "}
														{order.shippingAddress.postalCode}, {order.shippingAddress.country}
													</p>
												</div>
											)}

											{/* Products */}
											<div className="space-y-3">
												{order.products?.map((item, idx) => (
													<div
														key={`${order._id}-${idx}`}
														className="flex items-center gap-3 bg-nova-bg/50 rounded-md p-3"
													>
														<img
															src={getProductImage(item.product)}
															alt={item.product?.name || "Product"}
															className="w-14 h-14 rounded object-cover"
														/>
														<div className="flex-1 min-w-0">
															<p className="text-sm text-nova-ink truncate">
																{item.product?.name || "Product"}
															</p>
															<p className="text-xs text-nova-muted">
																Qty {item.quantity} · ₹{Number(item.price).toFixed(2)} each
																{[
																	item.size && `Size ${item.size}`,
																	item.color && `Color ${item.color}`,
																	item.style && `Style ${item.style}`,
																]
																	.filter(Boolean)
																	.map((v) => ` · ${v}`)
																	.join("")}
															</p>
														</div>
														<p className="text-sm text-nova-accent font-medium">
															₹{(item.quantity * item.price).toFixed(2)}
														</p>
													</div>
												))}
											</div>

											{/* Return status */}
											{order.returnRequest?.status && order.returnRequest.status !== "none" && (
												<div className="text-sm rounded-md p-3 bg-nova-bg/40 text-nova-muted">
													<p className="font-semibold capitalize text-amber-300">
														Return: {order.returnRequest.status}
													</p>
													{order.returnRequest.reason && (
														<p className="mt-1 text-nova-muted">Reason: {order.returnRequest.reason}</p>
													)}
													{order.returnRequest.adminNote && (
														<p className="mt-1 text-nova-muted">
															Admin note: {order.returnRequest.adminNote}
														</p>
													)}
												</div>
											)}

											{/* History */}
											<div>
												<h4 className="text-sm font-semibold text-nova-muted mb-2">Status history</h4>
												<ul className="space-y-2">
													{[...history].reverse().map((entry, idx) => (
														<li
															key={`${order._id}-hist-${idx}`}
															className="text-sm text-nova-muted flex flex-col sm:flex-row sm:gap-3"
														>
															<span className="text-nova-muted min-w-[160px]">
																{entry.changedAt
																	? new Date(entry.changedAt).toLocaleString()
																	: "—"}
															</span>
															<span className="capitalize text-nova-ink">{entry.status}</span>
															{entry.note && (
																<span className="text-nova-muted">— {entry.note}</span>
															)}
														</li>
													))}
												</ul>
											</div>

											<div className="flex flex-wrap gap-2">
												{canCancel(order.status) && (
													<button
														onClick={() => handleCancel(order._id)}
														disabled={loading}
														className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-md"
													>
														Cancel Order
													</button>
												)}
												{canReturn(order) && (
													<button
														onClick={() => handleReturn(order._id)}
														disabled={loading}
														className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-nova-ink text-sm px-4 py-2 rounded-md"
													>
														Request Return
													</button>
												)}
											</div>
										</div>
									)}
								</motion.div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};

export default OrdersPage;
