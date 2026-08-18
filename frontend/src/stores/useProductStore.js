import { create } from "zustand";
import toast from "react-hot-toast";
import axios from "../lib/axios";

const defaultPagination = {
	page: 1,
	limit: 12,
	total: 0,
	totalPages: 1,
	hasNextPage: false,
	hasPrevPage: false,
};

const defaultFilters = {
	search: "",
	category: "all",
	minPrice: "",
	maxPrice: "",
	sort: "newest",
	availableCategories: [],
	priceRange: { min: 0, max: 0 },
};

export const useProductStore = create((set, get) => ({
	products: [],
	catalogProducts: [],
	categories: [],
	pagination: defaultPagination,
	catalogFilters: defaultFilters,
	loading: false,

	setProducts: (products) => set({ products }),

	fetchCategories: async () => {
		try {
			const response = await axios.get("/products/categories");
			set({ categories: response.data.categories || [] });
			return response.data.categories || [];
		} catch (error) {
			console.error("Failed to fetch categories", error);
			toast.error(error.response?.data?.message || "Failed to load categories");
			return [];
		}
	},

	createProduct: async (productData) => {
		set({ loading: true });
		try {
			const res = await axios.post("/products", productData);
			toast.success("Product created successfully");
			set((prevState) => ({
				products: [...prevState.products, res.data],
				loading: false,
			}));
			await get().fetchCategories();
			return res.data;
		} catch (error) {
			toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to create product");
			set({ loading: false });
			throw error;
		}
	},

	updateProduct: async (productId, productData) => {
		set({ loading: true });
		try {
			const response = await axios.put(`/products/${productId}`, productData);
			toast.success("Product updated successfully");
			set((prevState) => ({
				products: prevState.products.map((product) =>
					product._id === productId ? response.data : product
				),
				loading: false,
			}));
			await get().fetchCategories();
			return response.data;
		} catch (error) {
			toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to update product");
			set({ loading: false });
			throw error;
		}
	},

	fetchAllProducts: async () => {
		set({ loading: true });
		try {
			const response = await axios.get("/products");
			set({ products: response.data.products, loading: false });
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.error || "Failed to fetch products");
		}
	},

	fetchProductsByCategory: async (category) => {
		set({ loading: true });
		try {
			const response = await axios.get(`/products/category/${category}`);
			set({ products: response.data.products, loading: false });
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.error || "Failed to fetch products");
		}
	},

	fetchCatalog: async (params = {}) => {
		set({ loading: true });
		try {
			const current = get().catalogFilters;
			const query = {
				search: params.search ?? current.search ?? "",
				category: params.category ?? current.category ?? "all",
				minPrice: params.minPrice ?? current.minPrice ?? "",
				maxPrice: params.maxPrice ?? current.maxPrice ?? "",
				sort: params.sort ?? current.sort ?? "newest",
				page: params.page ?? get().pagination.page ?? 1,
				limit: params.limit ?? get().pagination.limit ?? 12,
			};

			const response = await axios.get("/products/catalog", { params: query });
			set({
				catalogProducts: response.data.products,
				products: response.data.products,
				pagination: response.data.pagination,
				catalogFilters: {
					...defaultFilters,
					...response.data.filters,
					search: query.search,
					category: query.category,
					minPrice: query.minPrice,
					maxPrice: query.maxPrice,
					sort: query.sort,
				},
				loading: false,
			});
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "Failed to load catalog");
		}
	},

	deleteProduct: async (productId) => {
		set({ loading: true });
		try {
			await axios.delete(`/products/${productId}`);
			set((prevProducts) => ({
				products: prevProducts.products.filter((product) => product._id !== productId),
				catalogProducts: prevProducts.catalogProducts.filter(
					(product) => product._id !== productId
				),
				loading: false,
			}));
			await get().fetchCategories();
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.error || "Failed to delete product");
		}
	},

	toggleFeaturedProduct: async (productId) => {
		set({ loading: true });
		try {
			const response = await axios.patch(`/products/${productId}`);
			set((prevProducts) => ({
				products: prevProducts.products.map((product) =>
					product._id === productId
						? { ...product, isFeatured: response.data.isFeatured }
						: product
				),
				loading: false,
			}));
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.error || "Failed to update product");
		}
	},

	fetchFeaturedProducts: async () => {
		set({ loading: true });
		try {
			const response = await axios.get("/products/featured");
			set({ products: response.data, loading: false });
		} catch (error) {
			set({ loading: false });
			console.log("Error fetching featured products:", error);
		}
	},
}));
