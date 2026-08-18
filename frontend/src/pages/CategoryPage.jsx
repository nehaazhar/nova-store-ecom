import { useEffect, useMemo } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "../components/ProductCard";
import ProductFilters from "../components/ProductFilters";
import { useProductStore } from "../stores/useProductStore";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

const CategoryPage = () => {
	const { category } = useParams();
	const [searchParams, setSearchParams] = useSearchParams();
	const { catalogProducts, catalogFilters, pagination, loading, fetchCatalog } =
		useProductStore();

	const queryFromUrl = useMemo(
		() => ({
			search: searchParams.get("search") || "",
			category,
			minPrice: searchParams.get("minPrice") || "",
			maxPrice: searchParams.get("maxPrice") || "",
			sort: searchParams.get("sort") || "newest",
			page: Number(searchParams.get("page") || 1),
			limit: Number(searchParams.get("limit") || 12),
		}),
		[searchParams, category]
	);

	const debouncedSearch = useDebouncedValue(queryFromUrl.search, 300);

	useEffect(() => {
		fetchCatalog({ ...queryFromUrl, search: debouncedSearch });
	}, [
		fetchCatalog,
		debouncedSearch,
		queryFromUrl.category,
		queryFromUrl.minPrice,
		queryFromUrl.maxPrice,
		queryFromUrl.sort,
		queryFromUrl.page,
		queryFromUrl.limit,
	]);

	const updateParams = (updates) => {
		const next = { ...queryFromUrl, ...updates };
		const params = new URLSearchParams();

		if (next.search) params.set("search", next.search);
		if (next.minPrice !== "" && next.minPrice != null) params.set("minPrice", next.minPrice);
		if (next.maxPrice !== "" && next.maxPrice != null) params.set("maxPrice", next.maxPrice);
		if (next.sort && next.sort !== "newest") params.set("sort", next.sort);
		if (next.page && Number(next.page) > 1) params.set("page", String(next.page));

		setSearchParams(params);
	};

	const clearFilters = () => {
		setSearchParams({});
	};

	return (
		<div className="nova-container py-10 sm:py-12">
			<motion.div
				className="mb-8 text-center"
				initial={{ opacity: 0, y: -12 }}
				animate={{ opacity: 1, y: 0 }}
			>
				<p className="text-sm font-medium uppercase tracking-wider text-nova-accent">
					Category
				</p>
				<h1 className="mt-1 font-display text-3xl font-bold capitalize text-nova-ink sm:text-4xl">
					{category}
				</h1>
				<p className="mt-2 text-nova-muted">
					<Link to="/shop" className="font-medium text-nova-accent hover:underline">
						Browse all products
					</Link>
				</p>
			</motion.div>

			<ProductFilters
				filters={{ ...catalogFilters, ...queryFromUrl }}
				onChange={updateParams}
				onClear={clearFilters}
				showCategory={false}
			/>

			<div className="mb-4 flex items-center justify-between text-sm text-nova-muted">
				<p>
					{loading
						? "Loading..."
						: `${pagination.total || 0} product${pagination.total === 1 ? "" : "s"} found`}
				</p>
				<p>
					Page {pagination.page || 1} of {pagination.totalPages || 1}
				</p>
			</div>

			<motion.div
				className="grid grid-cols-1 justify-items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
			>
				{!loading && catalogProducts?.length === 0 && (
					<h2 className="col-span-full py-16 text-center text-xl font-semibold text-nova-muted">
						No products found
					</h2>
				)}

				{catalogProducts?.map((product) => (
					<ProductCard key={product._id} product={product} />
				))}
			</motion.div>

			{pagination.totalPages > 1 && (
				<div className="mt-10 flex items-center justify-center gap-3">
					<button
						type="button"
						disabled={!pagination.hasPrevPage || loading}
						onClick={() => updateParams({ page: (pagination.page || 1) - 1 })}
						className="nova-btn-ghost disabled:opacity-40"
					>
						<ChevronLeft size={16} />
						Prev
					</button>
					<span className="text-sm text-nova-muted">
						{pagination.page} / {pagination.totalPages}
					</span>
					<button
						type="button"
						disabled={!pagination.hasNextPage || loading}
						onClick={() => updateParams({ page: (pagination.page || 1) + 1 })}
						className="nova-btn-ghost disabled:opacity-40"
					>
						Next
						<ChevronRight size={16} />
					</button>
				</div>
			)}
		</div>
	);
};

export default CategoryPage;
