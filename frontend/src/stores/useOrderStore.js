import { create } from "zustand";
import toast from "react-hot-toast";
import axios from "../lib/axios";

export const useOrderStore = create((set) => ({
	orders: [],
	myOrders: [],
	selectedOrder: null,
	loading: false,

	fetchAllOrders: async (params = {}) => {
		set({ loading: true });
		try {
			const response = await axios.get("/orders", { params });
			set({ orders: response.data.orders, loading: false });
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "Failed to fetch orders");
		}
	},

	fetchMyOrders: async (params = {}) => {
		set({ loading: true });
		try {
			const response = await axios.get("/orders/my-orders", { params });
			set({ myOrders: response.data.orders, loading: false });
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "Failed to fetch your orders");
		}
	},

	fetchOrderById: async (orderId) => {
		set({ loading: true });
		try {
			const response = await axios.get(`/orders/${orderId}`);
			set({ selectedOrder: response.data, loading: false });
			return response.data;
		} catch (error) {
			set({ loading: false, selectedOrder: null });
			toast.error(error.response?.data?.message || "Failed to fetch order");
			return null;
		}
	},

	updateOrderStatus: async (orderId, status) => {
		set({ loading: true });
		try {
			const response = await axios.put(`/orders/${orderId}/status`, { status });
			set((prevState) => ({
				orders: prevState.orders.map((order) =>
					order._id === orderId ? response.data : order
				),
				myOrders: prevState.myOrders.map((order) =>
					order._id === orderId ? response.data : order
				),
				selectedOrder:
					prevState.selectedOrder?._id === orderId ? response.data : prevState.selectedOrder,
				loading: false,
			}));
			toast.success("Order status updated");
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "Failed to update order status");
		}
	},

	cancelMyOrder: async (orderId) => {
		set({ loading: true });
		try {
			const response = await axios.put(`/orders/my-orders/${orderId}/cancel`);
			set((prevState) => ({
				myOrders: prevState.myOrders.map((order) =>
					order._id === orderId ? response.data : order
				),
				selectedOrder:
					prevState.selectedOrder?._id === orderId ? response.data : prevState.selectedOrder,
				loading: false,
			}));
			toast.success(
				response.data.refundStatus === "refunded"
					? "Order cancelled and refunded"
					: "Order cancelled"
			);
			return response.data;
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "Failed to cancel order");
			return null;
		}
	},

	requestReturn: async (orderId, reason) => {
		set({ loading: true });
		try {
			const response = await axios.put(`/orders/my-orders/${orderId}/return`, { reason });
			set((prevState) => ({
				myOrders: prevState.myOrders.map((order) =>
					order._id === orderId ? response.data : order
				),
				loading: false,
			}));
			toast.success("Return requested");
			return response.data;
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "Failed to request return");
			return null;
		}
	},

	resolveReturn: async (orderId, status, adminNote = "") => {
		set({ loading: true });
		try {
			const response = await axios.put(`/orders/${orderId}/return`, { status, adminNote });
			set((prevState) => ({
				orders: prevState.orders.map((order) =>
					order._id === orderId ? response.data : order
				),
				loading: false,
			}));
			toast.success(`Return ${status}`);
			return response.data;
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "Failed to resolve return");
			return null;
		}
	},

	clearSelectedOrder: () => set({ selectedOrder: null }),
}));
