import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";
import { useWishlistStore } from "./useWishlistStore";

export const useUserStore = create((set, get) => ({
	user: null,
	loading: false,
	checkingAuth: true,

	signup: async ({ name, email, password, confirmPassword }) => {
		set({ loading: true });

		if (password !== confirmPassword) {
			set({ loading: false });
			toast.error("Passwords do not match");
			return false;
		}

		try {
			const res = await axios.post("/auth/signup", { name, email, password });
			set({ user: null, loading: false });
			toast.success("Account created. Check your email to verify it.");
			return true;
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "An error occurred");
			return false;
		}
	},
	login: async (email, password) => {
		set({ loading: true });

		try {
			const res = await axios.post("/auth/login", { email, password });

			set({ user: res.data, loading: false });
			return true;
		} catch (error) {
			set({ loading: false });
			const code = error.response?.data?.code;
			const message = error.response?.data?.message || "An error occurred";
			toast.error(message);
			return { ok: false, code, message };
		}
	},

	logout: async () => {
		try {
			await axios.post("/auth/logout");
			set({ user: null });
			useWishlistStore.setState({ wishlist: [] });
		} catch (error) {
			toast.error(error.response?.data?.message || "An error occurred during logout");
		}
	},

	forgotPassword: async (email) => {
		set({ loading: true });
		try {
			const res = await axios.post("/auth/forgot-password", { email });
			set({ loading: false });
			toast.success(res.data.message);
			return true;
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "Could not send reset email");
			return false;
		}
	},

	resetPassword: async ({ token, password }) => {
		set({ loading: true });
		try {
			const res = await axios.post("/auth/reset-password", { token, password });
			set({ loading: false });
			toast.success(res.data.message);
			return true;
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "Could not reset password");
			return false;
		}
	},

	verifyEmail: async (token) => {
		const res = await axios.post("/auth/verify-email", { token });
		return res.data;
	},

	resendVerification: async (email) => {
		set({ loading: true });
		try {
			const res = await axios.post("/auth/resend-verification", { email });
			set({ loading: false });
			toast.success(res.data.message);
			return true;
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "Could not resend email");
			return false;
		}
	},

	updateProfile: async (name) => {
		set({ loading: true });
		try {
			const res = await axios.put("/auth/profile", { name });
			set({ user: res.data, loading: false });
			toast.success("Profile updated");
			return true;
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "Could not update profile");
			return false;
		}
	},

	changePassword: async ({ currentPassword, newPassword }) => {
		set({ loading: true });
		try {
			const res = await axios.put("/auth/password", { currentPassword, newPassword });
			set({ loading: false });
			toast.success(res.data.message || "Password updated");
			return true;
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "Could not update password");
			return false;
		}
	},

	checkAuth: async () => {
		set({ checkingAuth: true });
		try {
			const response = await axios.get("/auth/profile");
			set({ user: response.data, checkingAuth: false });
		} catch (error) {
			console.log(error.message);
			set({ checkingAuth: false, user: null });
		}
	},

	refreshToken: async () => {
		// Prevent multiple simultaneous refresh attempts
		if (get().checkingAuth) return;

		set({ checkingAuth: true });
		try {
			const response = await axios.post("/auth/refresh-token");
			set({ checkingAuth: false });
			return response.data;
		} catch (error) {
			set({ user: null, checkingAuth: false });
			throw error;
		}
	},
}));

let refreshPromise = null;

axios.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;
		if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
			const url = originalRequest.url || "";
			if (
				url.includes("/auth/login") ||
				url.includes("/auth/signup") ||
				url.includes("/auth/refresh-token") ||
				url.includes("/auth/forgot-password") ||
				url.includes("/auth/reset-password") ||
				url.includes("/auth/verify-email") ||
				url.includes("/auth/resend-verification")
			) {
				return Promise.reject(error);
			}
			originalRequest._retry = true;

			try {
				// If a refresh is already in progress, wait for it to complete
				if (refreshPromise) {
					await refreshPromise;
					return axios(originalRequest);
				}

				// Start a new refresh process
				refreshPromise = useUserStore.getState().refreshToken();
				await refreshPromise;
				refreshPromise = null;

				return axios(originalRequest);
			} catch (refreshError) {
				// If refresh fails, redirect to login or handle as needed
				useUserStore.getState().logout();
				return Promise.reject(refreshError);
			}
		}
		return Promise.reject(error);
	}
);
