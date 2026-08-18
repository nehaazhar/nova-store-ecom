import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useOrderStore } from "../stores/useOrderStore";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

const orderStatusOptions = ["pending", "processing", "shipped", "delivered", "cancelled"];
const STATUS_FLOW = {
	pending: ["processing", "cancelled"],
	processing: ["shipped", "cancelled"],
	shipped: ["delivered"],
	delivered: [],
	cancelled: [],
};

const statusStyles = {
	pending: "bg-gray-600 text-white",
	processing: "bg-yellow-500 text-gray-900",
	shipped: "bg-blue-500 text-white",
	delivered: "bg-emerald-500 text-gray-900",
	cancelled: "bg-red-500 text-white",
};

const AdminOrders = () => {
	const { orders, fetchAllOrders, updateOrderStatus, resolveReturn, loading } = useOrderStore();
	const [statusFilter, setStatusFilter] = useState("all");
	const [returnFilter, setReturnFilter] = useState("all");
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebouncedValue(search, 250);

	useEffect(() => {
		fetchAllOrders({ status: statusFilter, search: debouncedSearch, returnStatus: returnFilter });
	}, [fetchAllOrders, statusFilter, debouncedSearch, returnFilter]);

	const nextOptionsFor = (current) => {
		const next = STATUS_FLOW[current] || [];
		return [current, ...next.filter((s) => s !== current)];
	};

	const handleResolveReturn = async (orderId, status) => {
		const adminNote =
			window.prompt(
				status === "approved"
					? "Optional note for approved return:"
					: "Reason for rejecting return:"
			) || "";
		await resolveReturn(orderId, status, adminNote);
	};

	return (
		<motion.div
			className="bg-gray-800 shadow-lg rounded-lg p-8 mb-8 max-w-6xl mx-auto"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.8 }}
		>
			<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
				<div>
					<h2 className="text-2xl font-semibold text-emerald-300">Order Management</h2>
					<p className="text-sm text-gray-400 mt-1">Total orders: {orders?.length || 0}</p>
				</div>
				<div className="flex flex-col sm:flex-row gap-3">
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search order id / customer..."
						className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white"
					/>
					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
						className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white"
					>
						<option value="all">All statuses</option>
						{orderStatusOptions.map((status) => (
							<option key={status} value={status}>
								{status}
							</option>
						))}
					</select>
					<select
						value={returnFilter}
						onChange={(e) => setReturnFilter(e.target.value)}
						className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white"
					>
						<option value="all">All returns</option>
						<option value="requested">Return requested</option>
						<option value="approved">Return approved</option>
						<option value="rejected">Return rejected</option>
					</select>
				</div>
			</div>

			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-700">
					<thead className="bg-gray-700">
						<tr>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Order</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Customer</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Ship to</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Total</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Return</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Update</th>
						</tr>
					</thead>
					<tbody className="bg-gray-800 divide-y divide-gray-700">
						{orders?.length === 0 && (
							<tr>
								<td colSpan={7} className="px-4 py-8 text-center text-gray-400">
									No orders found
								</td>
							</tr>
						)}
						{orders?.map((order) => (
							<tr key={order._id} className="hover:bg-gray-700/50">
								<td className="px-4 py-4 text-sm text-gray-200 font-mono">
									{order._id.slice(-8).toUpperCase()}
									<div className="text-xs text-gray-500 mt-1">
										{new Date(order.createdAt).toLocaleDateString()}
									</div>
								</td>
								<td className="px-4 py-4 text-sm text-gray-200">
									<div>{order.user?.name}</div>
									<div className="text-gray-400 text-xs">{order.user?.email}</div>
								</td>
								<td className="px-4 py-4 text-xs text-gray-300 max-w-[180px]">
									{order.shippingAddress ? (
										<>
											<div>{order.shippingAddress.fullName}</div>
											<div className="text-gray-500">
												{order.shippingAddress.city}, {order.shippingAddress.state}
											</div>
										</>
									) : (
										"—"
									)}
								</td>
								<td className="px-4 py-4 text-sm text-emerald-400">
									₹{Number(order.totalAmount).toFixed(2)}
								</td>
								<td className="px-4 py-4 text-sm">
									<span
										className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${
											statusStyles[order.status] || statusStyles.pending
										}`}
									>
										{order.status}
									</span>
								</td>
								<td className="px-4 py-4 text-sm text-gray-300">
									{order.returnRequest?.status && order.returnRequest.status !== "none" ? (
										<div className="space-y-2">
											<span className="capitalize text-amber-300 text-xs font-semibold">
												{order.returnRequest.status}
											</span>
											{order.returnRequest.reason && (
												<p className="text-xs text-gray-500 max-w-[140px]">
													{order.returnRequest.reason}
												</p>
											)}
											{order.returnRequest.status === "requested" && (
												<div className="flex flex-col gap-1">
													<button
														type="button"
														onClick={() => handleResolveReturn(order._id, "approved")}
														className="text-xs bg-emerald-700 hover:bg-emerald-600 px-2 py-1 rounded"
													>
														Approve
													</button>
													<button
														type="button"
														onClick={() => handleResolveReturn(order._id, "rejected")}
														className="text-xs bg-red-700 hover:bg-red-600 px-2 py-1 rounded"
													>
														Reject
													</button>
												</div>
											)}
										</div>
									) : (
										<span className="text-gray-500 text-xs">—</span>
									)}
								</td>
								<td className="px-4 py-4 text-sm text-gray-200">
									<select
										value={order.status}
										onChange={(e) => updateOrderStatus(order._id, e.target.value)}
										className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
										disabled={loading || nextOptionsFor(order.status).length <= 1}
									>
										{nextOptionsFor(order.status).map((statusOption) => (
											<option key={statusOption} value={statusOption}>
												{statusOption}
											</option>
										))}
									</select>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</motion.div>
	);
};

export default AdminOrders;
