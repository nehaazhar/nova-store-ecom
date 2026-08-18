import { create } from "zustand";
import toast from "react-hot-toast";
import axios from "../lib/axios";

export const useAddressStore = create((set, get) => ({
	addresses: [],
	selectedAddressId: null,
	loading: false,

	fetchAddresses: async () => {
		set({ loading: true });
		try {
			const res = await axios.get("/addresses");
			const addresses = res.data.addresses || [];
			const defaultAddr =
				addresses.find((a) => a.isDefault) || addresses[0] || null;
			set({
				addresses,
				selectedAddressId: defaultAddr?._id || null,
				loading: false,
			});
			return addresses;
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "Failed to load addresses");
			return [];
		}
	},

	selectAddress: (addressId) => set({ selectedAddressId: addressId }),

	addAddress: async (payload) => {
		set({ loading: true });
		try {
			const res = await axios.post("/addresses", payload);
			const addresses = res.data.addresses || [];
			const newest = addresses[addresses.length - 1];
			set({
				addresses,
				selectedAddressId: newest?._id || get().selectedAddressId,
				loading: false,
			});
			toast.success("Address saved");
			return newest;
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "Failed to add address");
			return null;
		}
	},

	updateAddress: async (addressId, payload) => {
		set({ loading: true });
		try {
			const res = await axios.put(`/addresses/${addressId}`, payload);
			set({ addresses: res.data.addresses || [], loading: false });
			toast.success("Address updated");
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "Failed to update address");
		}
	},

	deleteAddress: async (addressId) => {
		set({ loading: true });
		try {
			const res = await axios.delete(`/addresses/${addressId}`);
			const addresses = res.data.addresses || [];
			const selected =
				get().selectedAddressId === addressId
					? addresses.find((a) => a.isDefault)?._id || addresses[0]?._id || null
					: get().selectedAddressId;
			set({ addresses, selectedAddressId: selected, loading: false });
			toast.success("Address deleted");
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "Failed to delete address");
		}
	},

	setDefaultAddress: async (addressId) => {
		try {
			const res = await axios.put(`/addresses/${addressId}/default`);
			set({
				addresses: res.data.addresses || [],
				selectedAddressId: addressId,
			});
			toast.success("Default address set");
		} catch (error) {
			toast.error(error.response?.data?.message || "Failed to set default");
		}
	},

	getSelectedAddress: () => {
		const { addresses, selectedAddressId } = get();
		return addresses.find((a) => a._id === selectedAddressId) || null;
	},
}));
