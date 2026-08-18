import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MapPin, Plus, Trash2, Check, LocateFixed } from "lucide-react";
import { useAddressStore } from "../stores/useAddressStore";
import {
	getBrowserCoordinates,
	lookupAddressFromCoordinates,
} from "../utils/geolocation.utils";

const emptyForm = {
	fullName: "",
	phone: "",
	line1: "",
	line2: "",
	city: "",
	state: "",
	postalCode: "",
	country: "India",
	isDefault: false,
};

const AddressFormFields = ({ form, setForm }) => {
	const [locating, setLocating] = useState(false);

	const fillFromCurrentLocation = async () => {
		setLocating(true);
		try {
			const coords = await getBrowserCoordinates();
			const data = await lookupAddressFromCoordinates(coords);
			const next = data.address || {};
			setForm((prev) => ({
				...prev,
				line1: next.line1 || prev.line1,
				line2: next.line2 || prev.line2,
				city: next.city || prev.city,
				state: next.state || prev.state,
				postalCode: next.postalCode || prev.postalCode,
				country: next.country || prev.country || "India",
			}));
			if (data.incomplete || !next.postalCode) {
				toast.success("Location filled. Please confirm street and PIN code.");
			} else {
				toast.success("Address filled from your current location");
			}
		} catch (error) {
			toast.error(
				error.response?.data?.message || error.message || "Could not use current location"
			);
		} finally {
			setLocating(false);
		}
	};

	return (
		<div className="space-y-3">
			<button
				type="button"
				onClick={fillFromCurrentLocation}
				disabled={locating}
				className="inline-flex items-center gap-2 text-sm text-nova-accent hover:text-nova-accent-dark disabled:opacity-50"
			>
				<LocateFixed size={16} />
				{locating ? "Detecting location..." : "Use current location"}
			</button>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{[
					["fullName", "Full name"],
					["phone", "Phone"],
					["line1", "Address line 1"],
					["line2", "Address line 2 (optional)"],
					["city", "City"],
					["state", "State"],
					["postalCode", "Postal code"],
					["country", "Country"],
				].map(([key, label]) => (
					<input
						key={key}
						value={form[key]}
						onChange={(e) => setForm({ ...form, [key]: e.target.value })}
						placeholder={label}
						required={key !== "line2"}
						className={`bg-nova-bg border border-nova-line rounded-md px-3 py-2 text-sm text-nova-ink ${
							key === "line1" || key === "line2" ? "sm:col-span-2" : ""
						}`}
					/>
				))}
			</div>
		</div>
	);
};

export const CheckoutAddressCard = () => {
	const {
		addresses,
		selectedAddressId,
		fetchAddresses,
		selectAddress,
		addAddress,
		loading,
	} = useAddressStore();
	const [showForm, setShowForm] = useState(false);
	const [form, setForm] = useState(emptyForm);

	useEffect(() => {
		fetchAddresses();
	}, [fetchAddresses]);

	const handleAdd = async (e) => {
		e.preventDefault();
		const created = await addAddress({
			...form,
			isDefault: addresses.length === 0 ? true : form.isDefault,
		});
		if (created) {
			setForm(emptyForm);
			setShowForm(false);
		}
	};

	return (
		<div className="nova-card space-y-4 p-5 sm:p-6">
			<div className="flex items-center justify-between gap-2">
				<p className="flex items-center gap-2 font-display text-lg font-bold text-nova-ink">
					<MapPin size={18} className="text-nova-accent" />
					Shipping address
				</p>
				<button
					type="button"
					onClick={() => setShowForm((v) => !v)}
					className="text-sm text-nova-accent hover:text-nova-accent inline-flex items-center gap-1"
				>
					<Plus size={14} />
					{showForm ? "Close" : "New"}
				</button>
			</div>

			{loading && addresses.length === 0 ? (
				<p className="text-sm text-nova-muted">Loading addresses...</p>
			) : addresses.length === 0 && !showForm ? (
				<p className="text-sm text-amber-400">
					Add a shipping address to continue checkout.
				</p>
			) : (
				<div className="space-y-2">
					{addresses.map((addr) => (
						<label
							key={addr._id}
							className={`flex gap-3 p-3 rounded-md border cursor-pointer ${
								selectedAddressId === addr._id
									? "border-nova-accent bg-emerald-500/10"
									: "border-nova-line hover:border-gray-500"
							}`}
						>
							<input
								type="radio"
								name="checkout-address"
								checked={selectedAddressId === addr._id}
								onChange={() => selectAddress(addr._id)}
								className="mt-1"
							/>
							<div className="text-sm text-nova-ink">
								<p className="font-medium">
									{addr.fullName}{" "}
									{addr.isDefault && (
										<span className="text-xs text-nova-accent">(default)</span>
									)}
								</p>
								<p className="text-nova-muted">
									{addr.line1}
									{addr.line2 ? `, ${addr.line2}` : ""}
								</p>
								<p className="text-nova-muted">
									{addr.city}, {addr.state} {addr.postalCode}
								</p>
								<p className="text-nova-muted">{addr.phone}</p>
							</div>
						</label>
					))}
				</div>
			)}

			{showForm && (
				<form onSubmit={handleAdd} className="space-y-3 border-t border-nova-line pt-4">
					<AddressFormFields form={form} setForm={setForm} />
					<label className="flex items-center gap-2 text-sm text-nova-muted">
						<input
							type="checkbox"
							checked={form.isDefault}
							onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
						/>
						Set as default
					</label>
					<button
						type="submit"
						disabled={loading}
						className="bg-nova-accent hover:bg-nova-accent-dark disabled:opacity-50 text-white text-sm px-4 py-2 rounded-md"
					>
						Save address
					</button>
				</form>
			)}
		</div>
	);
};

const AddressesPage = () => {
	const {
		addresses,
		fetchAddresses,
		addAddress,
		updateAddress,
		deleteAddress,
		setDefaultAddress,
		loading,
	} = useAddressStore();
	const [form, setForm] = useState(emptyForm);
	const [editingId, setEditingId] = useState(null);

	useEffect(() => {
		fetchAddresses();
	}, [fetchAddresses]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (editingId) {
			await updateAddress(editingId, form);
			setEditingId(null);
		} else {
			await addAddress(form);
		}
		setForm(emptyForm);
	};

	const startEdit = (addr) => {
		setEditingId(addr._id);
		setForm({
			fullName: addr.fullName,
			phone: addr.phone,
			line1: addr.line1,
			line2: addr.line2 || "",
			city: addr.city,
			state: addr.state,
			postalCode: addr.postalCode,
			country: addr.country || "India",
			isDefault: addr.isDefault,
		});
	};

	return (
		<div className="nova-container py-10">
			<div className="mx-auto max-w-3xl space-y-6">
				<div>
					<p className="text-sm font-medium uppercase tracking-wider text-nova-accent">Account</p>
					<h1 className="mt-1 flex items-center gap-2 font-display text-3xl font-bold text-nova-ink">
						<MapPin className="text-nova-accent" /> My Addresses
					</h1>
					<p className="mt-1 text-nova-muted">Save shipping addresses for faster checkout</p>
				</div>

				<form
					onSubmit={handleSubmit}
					className="nova-card space-y-4 p-5 sm:p-6"
				>
					<h2 className="text-lg font-semibold text-nova-ink">
						{editingId ? "Edit address" : "Add new address"}
					</h2>
					<AddressFormFields form={form} setForm={setForm} />
					<label className="flex items-center gap-2 text-sm text-nova-muted">
						<input
							type="checkbox"
							checked={form.isDefault}
							onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
						/>
						Set as default
					</label>
					<div className="flex gap-2">
						<button
							type="submit"
							disabled={loading}
							className="bg-nova-accent hover:bg-nova-accent-dark disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm"
						>
							{editingId ? "Update" : "Add address"}
						</button>
						{editingId && (
							<button
								type="button"
								onClick={() => {
									setEditingId(null);
									setForm(emptyForm);
								}}
								className="bg-nova-bg hover:bg-nova-glow text-nova-ink px-4 py-2 rounded-md text-sm"
							>
								Cancel
							</button>
						)}
					</div>
				</form>

				<div className="space-y-3">
					{addresses.length === 0 ? (
						<p className="text-nova-muted text-sm">No saved addresses yet.</p>
					) : (
						addresses.map((addr) => (
							<div
								key={addr._id}
								className="bg-white border border-nova-line rounded-lg p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
							>
								<div className="text-sm text-nova-ink">
									<p className="font-medium text-nova-ink">
										{addr.fullName}{" "}
										{addr.isDefault && (
											<span className="text-xs text-nova-accent">Default</span>
										)}
									</p>
									<p className="text-nova-muted mt-1">
										{addr.line1}
										{addr.line2 ? `, ${addr.line2}` : ""}
									</p>
									<p className="text-nova-muted">
										{addr.city}, {addr.state} {addr.postalCode}, {addr.country}
									</p>
									<p className="text-nova-muted mt-1">{addr.phone}</p>
								</div>
								<div className="flex flex-wrap gap-2">
									{!addr.isDefault && (
										<button
											type="button"
											onClick={() => setDefaultAddress(addr._id)}
											className="inline-flex items-center gap-1 text-xs bg-nova-bg hover:bg-nova-glow px-3 py-1.5 rounded-md"
										>
											<Check size={12} /> Default
										</button>
									)}
									<button
										type="button"
										onClick={() => startEdit(addr)}
										className="text-xs bg-nova-bg hover:bg-nova-glow px-3 py-1.5 rounded-md"
									>
										Edit
									</button>
									<button
										type="button"
										onClick={() => {
											if (window.confirm("Delete this address?")) {
												deleteAddress(addr._id);
											}
										}}
										className="inline-flex items-center gap-1 text-xs bg-red-700/80 hover:bg-red-600 px-3 py-1.5 rounded-md"
									>
										<Trash2 size={12} /> Delete
									</button>
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
};

export default AddressesPage;
