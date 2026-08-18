import { useCallback, useEffect, useState } from "react";
import axios from "../lib/axios";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
	Ticket,
	CheckCircle2,
	XCircle,
	History,
	Search,
} from "lucide-react";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

const STATUS_FILTERS = [
	{ value: "all", label: "All" },
	{ value: "active", label: "Active" },
	{ value: "inactive", label: "Inactive" },
	{ value: "expired", label: "Expired" },
	{ value: "exhausted", label: "Exhausted" },
];

const emptyForm = {
	code: "",
	discountPercentage: "",
	expirationDate: "",
	minOrderAmount: "",
	maxUsage: "",
};

const statusBadgeClass = {
	active: "bg-emerald-600/20 text-emerald-300",
	inactive: "bg-gray-600/40 text-gray-300",
	expired: "bg-red-600/20 text-red-300",
	exhausted: "bg-amber-600/20 text-amber-300",
};

const CouponManagementTab = () => {
	const [coupons, setCoupons] = useState([]);
	const [stats, setStats] = useState({
		total: 0,
		active: 0,
		inactive: 0,
		expired: 0,
		exhausted: 0,
		totalRedemptions: 0,
		totalDiscountGiven: 0,
	});
	const [usageHistory, setUsageHistory] = useState([]);
	const [form, setForm] = useState(emptyForm);
	const [formErrors, setFormErrors] = useState([]);
	const [editingCouponId, setEditingCouponId] = useState(null);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [loading, setLoading] = useState(true);
	const debouncedSearch = useDebouncedValue(search, 300);

	const fetchStats = useCallback(async () => {
		try {
			const res = await axios.get("/coupons/admin/stats");
			setStats(res.data);
		} catch (error) {
			console.error("Failed to fetch coupon stats", error);
		}
	}, []);

	const fetchUsageHistory = useCallback(async (query = "") => {
		try {
			const res = await axios.get("/coupons/admin/usage-history", {
				params: { search: query, limit: 40 },
			});
			setUsageHistory(res.data);
		} catch (error) {
			console.error("Failed to fetch usage history", error);
		}
	}, []);

	const fetchCoupons = useCallback(
		async (query = search, status = statusFilter) => {
			try {
				const res = await axios.get("/coupons/admin", {
					params: { search: query, status },
				});
				setCoupons(res.data);
			} catch (error) {
				console.error("Failed to fetch coupons", error);
				toast.error(error.response?.data?.message || "Failed to load coupons");
			} finally {
				setLoading(false);
			}
		},
		[search, statusFilter]
	);

	const refreshAll = useCallback(
		async (query = search, status = statusFilter) => {
			await Promise.all([
				fetchCoupons(query, status),
				fetchStats(),
				fetchUsageHistory(query),
			]);
		},
		[fetchCoupons, fetchStats, fetchUsageHistory, search, statusFilter]
	);

	useEffect(() => {
		refreshAll();
	}, []);

	useEffect(() => {
		fetchCoupons(debouncedSearch, statusFilter);
		fetchUsageHistory(debouncedSearch);
	}, [debouncedSearch, statusFilter, fetchCoupons, fetchUsageHistory]);

	const validateFormClient = () => {
		const errors = [];
		if (!form.code.trim()) errors.push("Coupon code is required.");
		else if (!/^[A-Z0-9_-]{3,20}$/i.test(form.code.trim())) {
			errors.push("Coupon code must be 3–20 characters (letters, numbers, _ or -).");
		}

		const discount = Number(form.discountPercentage);
		if (!form.discountPercentage || Number.isNaN(discount)) {
			errors.push("Discount percentage is required.");
		} else if (discount < 1 || discount > 100) {
			errors.push("Discount percentage must be between 1 and 100.");
		}

		if (!form.expirationDate) {
			errors.push("Expiration date is required.");
		} else {
			const expiry = new Date(form.expirationDate);
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			if (expiry < today) errors.push("Expiration date must be today or a future date.");
		}

		if (form.minOrderAmount !== "" && Number(form.minOrderAmount) < 0) {
			errors.push("Minimum order amount cannot be negative.");
		}

		if (form.maxUsage !== "" && (Number(form.maxUsage) < 1 || !Number.isInteger(Number(form.maxUsage)))) {
			errors.push("Max usage must be a whole number of at least 1.");
		}

		return errors;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		const clientErrors = validateFormClient();
		if (clientErrors.length) {
			setFormErrors(clientErrors);
			toast.error(clientErrors[0]);
			return;
		}
		setFormErrors([]);

		try {
			if (editingCouponId) {
				await axios.put(`/coupons/admin/${editingCouponId}`, form);
				toast.success("Coupon updated successfully");
			} else {
				await axios.post("/coupons/admin", form);
				toast.success("Coupon created successfully");
			}
			setForm(emptyForm);
			setEditingCouponId(null);
			await refreshAll();
		} catch (error) {
			const apiErrors = error.response?.data?.errors;
			if (Array.isArray(apiErrors) && apiErrors.length) {
				setFormErrors(apiErrors);
			}
			toast.error(error.response?.data?.message || "Failed to save coupon");
		}
	};

	const handleToggleStatus = async (couponId) => {
		try {
			await axios.patch(`/coupons/admin/${couponId}`);
			toast.success("Coupon status updated");
			await refreshAll();
		} catch (error) {
			toast.error(error.response?.data?.message || "Failed to update coupon status");
		}
	};

	const handleDeleteCoupon = async (couponId) => {
		if (!window.confirm("Delete this coupon permanently?")) return;
		try {
			await axios.delete(`/coupons/admin/${couponId}`);
			toast.success("Coupon deleted");
			await refreshAll();
		} catch (error) {
			toast.error(error.response?.data?.message || "Failed to delete coupon");
		}
	};

	const handleEditCoupon = (coupon) => {
		setEditingCouponId(coupon._id);
		setFormErrors([]);
		setForm({
			code: coupon.code,
			discountPercentage: coupon.discountPercentage,
			expirationDate: coupon.expirationDate?.slice(0, 10) || "",
			minOrderAmount: coupon.minOrderAmount || "",
			maxUsage: coupon.maxUsage || "",
		});
	};

	const handleCancelEdit = () => {
		setEditingCouponId(null);
		setForm(emptyForm);
		setFormErrors([]);
	};

	const statsCards = [
		{ title: "Total Coupons", value: stats.total, icon: Ticket, color: "from-emerald-500 to-teal-700" },
		{ title: "Active", value: stats.active, icon: CheckCircle2, color: "from-emerald-500 to-green-700" },
		{ title: "Expired / Inactive", value: (stats.expired || 0) + (stats.inactive || 0), icon: XCircle, color: "from-rose-500 to-red-700" },
		{ title: "Redemptions", value: stats.totalRedemptions, icon: History, color: "from-cyan-500 to-blue-700" },
	];

	return (
		<div className="max-w-6xl mx-auto space-y-6">
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{statsCards.map((card) => (
					<motion.div
						key={card.title}
						className={`rounded-lg p-4 shadow-lg bg-gradient-to-br ${card.color}`}
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-emerald-50/90">{card.title}</p>
								<p className="text-2xl font-bold text-white mt-1">{card.value}</p>
							</div>
							<card.icon className="h-8 w-8 text-white/80" />
						</div>
					</motion.div>
				))}
			</div>

			{stats.totalDiscountGiven > 0 && (
				<p className="text-sm text-gray-400 text-right">
					Total discount given:{" "}
					<span className="text-emerald-400 font-medium">
						${Number(stats.totalDiscountGiven).toFixed(2)}
					</span>
				</p>
			)}

			<motion.div
				className="bg-gray-800 rounded-lg p-6 shadow-lg"
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
			>
				<h2 className="text-2xl font-semibold text-emerald-300 mb-4">
					{editingCouponId ? "Edit Coupon" : "Create Coupon"}
				</h2>

				{formErrors.length > 0 && (
					<div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 p-3">
						<ul className="list-disc ml-5 text-sm text-red-300 space-y-1">
							{formErrors.map((err) => (
								<li key={err}>{err}</li>
							))}
						</ul>
					</div>
				)}

				<form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2" noValidate>
					<input
						className="bg-gray-700 border border-gray-600 rounded-md p-2 text-white"
						placeholder="Coupon code (e.g. SAVE20)"
						value={form.code}
						onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
					/>
					<input
						className="bg-gray-700 border border-gray-600 rounded-md p-2 text-white"
						placeholder="Discount % (1–100)"
						type="number"
						min="1"
						max="100"
						value={form.discountPercentage}
						onChange={(e) => setForm({ ...form, discountPercentage: e.target.value })}
					/>
					<input
						className="bg-gray-700 border border-gray-600 rounded-md p-2 text-white"
						placeholder="Min order amount"
						type="number"
						min="0"
						value={form.minOrderAmount}
						onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
					/>
					<input
						className="bg-gray-700 border border-gray-600 rounded-md p-2 text-white"
						placeholder="Max usage"
						type="number"
						min="1"
						value={form.maxUsage}
						onChange={(e) => setForm({ ...form, maxUsage: e.target.value })}
					/>
					<input
						className="bg-gray-700 border border-gray-600 rounded-md p-2 text-white md:col-span-2"
						type="date"
						value={form.expirationDate}
						onChange={(e) => setForm({ ...form, expirationDate: e.target.value })}
					/>
					<div className="md:col-span-2 flex gap-3">
						<button
							type="submit"
							className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
						>
							{editingCouponId ? "Update Coupon" : "Create Coupon"}
						</button>
						{editingCouponId && (
							<button
								type="button"
								onClick={handleCancelEdit}
								className="rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-500"
							>
								Cancel
							</button>
						)}
					</div>
				</form>
			</motion.div>

			<motion.div className="bg-gray-800 rounded-lg p-6 shadow-lg">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
					<h3 className="text-xl font-semibold text-emerald-300">Existing Coupons</h3>
					<div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
						<div className="relative flex-1 sm:w-64">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
							<input
								className="w-full bg-gray-700 border border-gray-600 rounded-md pl-9 pr-3 py-2 text-white"
								placeholder="Search by code..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>
						<select
							className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
						>
							{STATUS_FILTERS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>
				</div>

				{loading ? (
					<p className="text-gray-400">Loading coupons...</p>
				) : coupons.length === 0 ? (
					<p className="text-gray-400">No coupons match your search/filter.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full text-sm text-left text-gray-300">
							<thead className="bg-gray-700">
								<tr>
									<th className="px-4 py-2">Code</th>
									<th className="px-4 py-2">Discount</th>
									<th className="px-4 py-2">Min Order</th>
									<th className="px-4 py-2">Usage</th>
									<th className="px-4 py-2">Expiry</th>
									<th className="px-4 py-2">Status</th>
									<th className="px-4 py-2">Actions</th>
								</tr>
							</thead>
							<tbody>
								{coupons.map((coupon) => (
									<tr key={coupon._id} className="border-t border-gray-700">
										<td className="px-4 py-2 font-medium">{coupon.code}</td>
										<td className="px-4 py-2">{coupon.discountPercentage}%</td>
										<td className="px-4 py-2">${coupon.minOrderAmount || 0}</td>
										<td className="px-4 py-2">
											{coupon.usageCount}/{coupon.maxUsage}
										</td>
										<td className="px-4 py-2">
											{new Date(coupon.expirationDate).toLocaleDateString()}
										</td>
										<td className="px-4 py-2">
											<span
												className={`inline-flex rounded-full px-2 py-0.5 text-xs capitalize ${
													statusBadgeClass[coupon.status] || statusBadgeClass.inactive
												}`}
											>
												{coupon.status || (coupon.isActive ? "active" : "inactive")}
											</span>
										</td>
										<td className="px-4 py-2 space-x-2 whitespace-nowrap">
											<button
												onClick={() => handleEditCoupon(coupon)}
												className="rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-700"
											>
												Edit
											</button>
											<button
												onClick={() => handleToggleStatus(coupon._id)}
												className="rounded bg-amber-600 px-2 py-1 text-white hover:bg-amber-700"
											>
												{coupon.isActive ? "Disable" : "Enable"}
											</button>
											<button
												onClick={() => handleDeleteCoupon(coupon._id)}
												className="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700"
											>
												Delete
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</motion.div>

			<motion.div
				className="bg-gray-800 rounded-lg p-6 shadow-lg"
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
			>
				<div className="flex items-center gap-2 mb-4">
					<History className="h-5 w-5 text-emerald-300" />
					<h3 className="text-xl font-semibold text-emerald-300">Coupon Usage History</h3>
				</div>

				{usageHistory.length === 0 ? (
					<p className="text-gray-400 text-sm">No redemptions recorded yet.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full text-sm text-left text-gray-300">
							<thead className="bg-gray-700">
								<tr>
									<th className="px-4 py-2">Date</th>
									<th className="px-4 py-2">Coupon</th>
									<th className="px-4 py-2">User</th>
									<th className="px-4 py-2">Order Amount</th>
									<th className="px-4 py-2">Discount</th>
								</tr>
							</thead>
							<tbody>
								{usageHistory.map((entry, idx) => (
									<tr
										key={`${entry.couponId}-${entry.usedAt}-${idx}`}
										className="border-t border-gray-700"
									>
										<td className="px-4 py-2">
											{entry.usedAt
												? new Date(entry.usedAt).toLocaleString()
												: "—"}
										</td>
										<td className="px-4 py-2">
											<span className="font-medium">{entry.code}</span>
											<span className="text-gray-500 ml-1">
												({entry.discountPercentage}%)
											</span>
										</td>
										<td className="px-4 py-2">
											{entry.user?.name || entry.user?.email || "Unknown user"}
										</td>
										<td className="px-4 py-2">
											${Number(entry.orderAmount || 0).toFixed(2)}
										</td>
										<td className="px-4 py-2 text-emerald-400">
											-${Number(entry.discountAmount || 0).toFixed(2)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</motion.div>
		</div>
	);
};

export default CouponManagementTab;
