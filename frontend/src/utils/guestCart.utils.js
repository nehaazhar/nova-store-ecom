import axios from "../lib/axios";
import { getVariantStock } from "./variant.utils";

export const GUEST_CART_KEY = "nova_guest_cart";

const sameLine = (a, b) =>
	String(a.productId) === String(b.productId) &&
	String(a.size || "") === String(b.size || "") &&
	String(a.color || "") === String(b.color || "") &&
	String(a.style || "") === String(b.style || "");

export const readGuestCart = () => {
	try {
		const raw = localStorage.getItem(GUEST_CART_KEY);
		const parsed = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

export const writeGuestCart = (items) => {
	localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
};

export const clearGuestCart = () => {
	localStorage.removeItem(GUEST_CART_KEY);
};

export const upsertGuestCartItem = (product, options = {}, quantityDelta = 1) => {
	const line = {
		productId: product._id,
		quantity: 1,
		size: options.size || "",
		color: options.color || "",
		style: options.style || "",
	};
	const items = readGuestCart();
	const existing = items.find((item) => sameLine(item, line));
	const available = getVariantStock(product, line);
	const nextQty = (existing?.quantity || 0) + quantityDelta;

	if (nextQty > available) {
		throw new Error(`Only ${available} item(s) available for this size/color/style`);
	}

	if (nextQty <= 0) {
		writeGuestCart(items.filter((item) => !sameLine(item, line)));
		return readGuestCart();
	}

	if (existing) {
		existing.quantity = nextQty;
	} else {
		items.push({ ...line, quantity: nextQty });
	}
	writeGuestCart(items);
	return items;
};

export const setGuestCartQuantity = (item, quantity) => {
	const line = {
		productId: item._id || item.productId,
		size: item.size || "",
		color: item.color || "",
		style: item.style || "",
	};
	const items = readGuestCart();
	if (quantity <= 0) {
		writeGuestCart(
			items.filter(
				(entry) =>
					!(
						String(entry.productId) === String(line.productId) &&
						String(entry.size || "") === line.size &&
						String(entry.color || "") === line.color &&
						String(entry.style || "") === line.style
					)
			)
		);
		return readGuestCart();
	}
	const existing = items.find(
		(entry) =>
			String(entry.productId) === String(line.productId) &&
			String(entry.size || "") === line.size &&
			String(entry.color || "") === line.color &&
			String(entry.style || "") === line.style
	);
	if (existing) existing.quantity = quantity;
	writeGuestCart(items);
	return items;
};

export const hydrateGuestCart = async (items) => {
	const hydrated = await Promise.all(
		items.map(async (item) => {
			try {
				const res = await axios.get(`/products/${item.productId}`);
				const product = res.data;
				const selection = {
					size: item.size || "",
					color: item.color || "",
					style: item.style || "",
				};
				return {
					...product,
					quantity: item.quantity || 1,
					...selection,
					variantStock: getVariantStock(product, selection),
					cartItemId: `guest-${item.productId}-${selection.size}-${selection.color}-${selection.style}`,
				};
			} catch {
				return null;
			}
		})
	);
	return hydrated.filter(Boolean);
};
