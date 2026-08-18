import { create } from "zustand";
import toast from "react-hot-toast";
import axios from "../lib/axios";

export const useWishlistStore = create((set, get) => ({
	wishlist: [],
	loading: false,

	fetchWishlist: async () => {
		set({ loading: true });
		try {
			const res = await axios.get("/wishlist");
			set({ wishlist: res.data.wishlist || [], loading: false });
		} catch (error) {
			set({ loading: false });
			console.error("Failed to fetch wishlist", error);
		}
	},

	toggleWishlist: async (productId) => {
		try {
			const res = await axios.post("/wishlist/toggle", { productId });
			const ids = (res.data.wishlist || []).map((id) =>
				typeof id === "string" ? id : id._id || id
			);

			// Keep full product objects when possible
			const current = get().wishlist;
			if (res.data.inWishlist) {
				set({
					wishlist: current.some((p) => (p._id || p) === productId)
						? current
						: [...current, { _id: productId }],
				});
				// Refresh for full product data
				get().fetchWishlist();
			} else {
				set({
					wishlist: current.filter((p) => (p._id || p).toString() !== productId.toString()),
				});
			}

			toast.success(res.data.message);
			return res.data.inWishlist;
		} catch (error) {
			toast.error(error.response?.data?.message || "Wishlist update failed");
			return null;
		}
	},

	isInWishlist: (productId) => {
		return get().wishlist.some(
			(item) => (item._id || item).toString() === productId?.toString()
		);
	},

	removeFromWishlist: async (productId) => {
		try {
			await axios.delete(`/wishlist/${productId}`);
			set({
				wishlist: get().wishlist.filter(
					(p) => (p._id || p).toString() !== productId.toString()
				),
			});
			toast.success("Removed from wishlist");
		} catch (error) {
			toast.error(error.response?.data?.message || "Failed to remove from wishlist");
		}
	},
}));
