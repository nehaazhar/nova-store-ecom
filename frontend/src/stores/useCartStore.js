import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";
import { useUserStore } from "./useUserStore";
import {
	clearGuestCart,
	hydrateGuestCart,
	readGuestCart,
	setGuestCartQuantity,
	upsertGuestCartItem,
} from "../utils/guestCart.utils";

const sameLine = (a, b) =>
	a._id === b._id &&
	(a.size || "") === (b.size || "") &&
	(a.color || "") === (b.color || "") &&
	(a.style || "") === (b.style || "");

export const useCartStore = create((set, get) => ({
	cart: [],
	coupon: null,
	availableCoupon: null,
	total: 0,
	subtotal: 0,
	isCouponApplied: false,
	addingToCart: false,
	addingProductId: null,
	cartUpdating: false,

	getMyCoupon: async () => {
		if (!useUserStore.getState().user) return;
		try {
			const response = await axios.get("/coupons");
			set({ availableCoupon: response.data || null });
		} catch (error) {
			console.error("Error fetching coupon:", error);
		}
	},

	applyCoupon: async (code) => {
		try {
			const trimmed = String(code || "").trim();
			if (!trimmed) {
				toast.error("Please enter a coupon code");
				return;
			}

			const subtotal = get().subtotal || 0;
			const response = await axios.post("/coupons/validate", {
				code: trimmed,
				subtotal,
			});

			set({ coupon: response.data, isCouponApplied: true });
			get().calculateTotals();
			toast.success(response.data.message || "Coupon applied successfully");
		} catch (error) {
			toast.error(error.response?.data?.message || "Failed to apply coupon");
		}
	},

	removeCoupon: () => {
		set({ coupon: null, isCouponApplied: false });
		get().calculateTotals();
		toast.success("Coupon removed");
	},

	getCartItems: async () => {
		if (!useUserStore.getState().user) {
			const hydrated = await hydrateGuestCart(readGuestCart());
			set({ cart: hydrated });
			get().calculateTotals();
			return;
		}
		try {
			const res = await axios.get("/cart");
			set({ cart: res.data });
			get().calculateTotals();
		} catch (error) {
			set({ cart: [] });
			toast.error(error.response?.data?.message || "An error occurred");
		}
	},

	mergeGuestCart: async () => {
		const items = readGuestCart();
		if (items.length > 0) {
			try {
				await axios.post("/cart/merge", { items });
			} catch (error) {
				toast.error(error.response?.data?.message || "Could not merge guest cart");
			}
		}
		clearGuestCart();
		await get().getCartItems();
	},

	clearCart: async () => {
		set({
			cart: [],
			coupon: null,
			availableCoupon: null,
			total: 0,
			subtotal: 0,
			isCouponApplied: false,
		});
	},

	addToCart: async (product, options = {}) => {
		if (get().addingToCart) return false;
		set({ addingToCart: true, addingProductId: product._id });
		try {
			const size = options.size || "";
			const color = options.color || "";
			const style = options.style || "";

			if (!useUserStore.getState().user) {
				upsertGuestCartItem(product, { size, color, style }, 1);
				toast.success("Product added to cart");
				await get().getCartItems();
				return true;
			}

			await axios.post("/cart", {
				productId: product._id,
				size,
				color,
				style,
			});
			toast.success("Product added to cart");

			await get().getCartItems();
			return true;
		} catch (error) {
			toast.error(error.response?.data?.message || error.message || "An error occurred");
			return false;
		} finally {
			set({ addingToCart: false, addingProductId: null });
		}
	},

	removeFromCart: async (item) => {
		set({ cartUpdating: true });
		try {
			if (!useUserStore.getState().user) {
				setGuestCartQuantity(item, 0);
				await get().getCartItems();
				return;
			}
			const productId = item._id;
			const cartItemId = item.cartItemId;
			await axios.delete(`/cart`, {
				data: {
					productId,
					cartItemId,
					size: item.size || "",
					color: item.color || "",
					style: item.style || "",
				},
			});
			set((prevState) => ({
				cart: prevState.cart.filter((c) =>
					cartItemId ? c.cartItemId !== cartItemId : !sameLine(c, item)
				),
			}));
			get().calculateTotals();
		} catch (error) {
			toast.error(error.response?.data?.message || "Could not remove item");
		} finally {
			set({ cartUpdating: false });
		}
	},

	updateQuantity: async (item, quantity) => {
		if (quantity === 0) {
			get().removeFromCart(item);
			return;
		}
		set({ cartUpdating: true });
		try {
			if (!useUserStore.getState().user) {
				setGuestCartQuantity(item, quantity);
				await get().getCartItems();
				return;
			}
			await axios.put(`/cart/${item._id}`, {
				quantity,
				cartItemId: item.cartItemId,
				size: item.size || "",
				color: item.color || "",
				style: item.style || "",
			});
			set((prevState) => ({
				cart: prevState.cart.map((c) =>
					(item.cartItemId && c.cartItemId === item.cartItemId) || sameLine(c, item)
						? { ...c, quantity }
						: c
				),
			}));
			get().calculateTotals();
		} catch (error) {
			toast.error(error.response?.data?.message || "Could not update quantity");
		} finally {
			set({ cartUpdating: false });
		}
	},

	calculateTotals: () => {
		const { cart, coupon, isCouponApplied } = get();
		const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
		let total = subtotal;

		if (isCouponApplied && coupon && coupon.discountPercentage) {
			const discount = subtotal * (coupon.discountPercentage / 100);
			total = subtotal - discount;
		}

		set({ subtotal, total });
	},
}));
