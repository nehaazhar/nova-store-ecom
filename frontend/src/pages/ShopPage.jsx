import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "../components/ProductCard";
import ProductFilters from "../components/ProductFilters";
import { useProductStore } from "../stores/useProductStore";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

const ShopPage = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const {
		catalogProducts,
		catalogFilters,
		pagination,
		loading,
		fetchCatalog,
	} = useProductStore();

	const queryFromUrl = useMemo(
		() => ({
			search: searchParams.get("search") || "",
			category: searchParams.get("category") || "all",
			minPrice: searchParams.get("minPrice") || "",
			maxPrice: searchParams.get("maxPrice") || "",
			sort: searchParams.get("sort") || "newest",
			page: Number(searchParams.get("page") || 1),
			limit: Number(searchParams.get("limit") || 12),
		}),
		[searchParams]
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
		if (next.category && next.category !== "all") params.set("category", next.category);
		if (next.minPrice !== "" && next.minPrice != null) params.set("minPrice", next.minPrice);
		if (next.maxPrice !== "" && next.maxPrice != null) params.set("maxPrice", next.maxPrice);
		if (next.sort && next.sort !== "newest") params.set("sort", next.sort);
		if (next.page && Number(next.page) > 1) params.set("page", String(next.page));
		if (next.limit && Number(next.limit) !== 12) params.set("limit", String(next.limit));

		setSearchParams(params);
	};

	const clearFilters = () => {
		setSearchParams({});
	};

	return (
		<div>
			<section className="relative overflow-hidden border-b border-nova-line bg-nova-ink">
				<div className="pointer-events-none absolute inset-0 bg-hero-mesh opacity-60" />
				<div className="nova-container relative py-12 sm:py-16">
					<motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">
							Catalog
						</p>
						<h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
							Shop everything
						</h1>
						<p className="mt-3 max-w-lg text-slate-300">
							Search, filter by price & category, and find your next favorite pick.
						</p>
					</motion.div>
				</div>
			</section>

			<div className="nova-container py-10 sm:py-12">

			<ProductFilters
				filters={{ ...catalogFilters, ...queryFromUrl }}
				onChange={updateParams}
				onClear={clearFilters}
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
						No products match your filters
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
						className="nova-btn-outline disabled:opacity-40"
					>
						<ChevronLeft size={16} />
						Prev
					</button>

					<div className="flex items-center gap-2">
						{Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
							.filter((pageNum) => {
								const current = pagination.page || 1;
								return (
									pageNum === 1 ||
									pageNum === pagination.totalPages ||
									Math.abs(pageNum - current) <= 1
								);
							})
							.map((pageNum, idx, arr) => {
								const prev = arr[idx - 1];
								const showDots = prev && pageNum - prev > 1;
								return (
									<span key={pageNum} className="flex items-center gap-2">
										{showDots && <span className="text-nova-muted">...</span>}
										<button
											type="button"
											onClick={() => updateParams({ page: pageNum })}
											className={`h-9 w-9 rounded-xl text-sm font-medium ${
												pageNum === pagination.page
													? "bg-accent-shine text-white shadow-lift"
													: "border border-nova-line bg-white text-nova-ink hover:border-nova-accent"
											}`}
										>
											{pageNum}
										</button>
									</span>
								);
							})}
					</div>

					<button
						type="button"
						disabled={!pagination.hasNextPage || loading}
						onClick={() => updateParams({ page: (pagination.page || 1) + 1 })}
						className="nova-btn-outline disabled:opacity-40"
					>
						Next
						<ChevronRight size={16} />
					</button>
				</div>
			)}
			</div>
		</div>
	);
};

export default ShopPage;
