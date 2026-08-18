import { Search, SlidersHorizontal, X } from "lucide-react";

const SORT_OPTIONS = [
	{ value: "relevance", label: "Best match" },
	{ value: "newest", label: "Newest" },
	{ value: "oldest", label: "Oldest" },
	{ value: "price-asc", label: "Price: Low to High" },
	{ value: "price-desc", label: "Price: High to Low" },
	{ value: "name-asc", label: "Name: A–Z" },
	{ value: "name-desc", label: "Name: Z–A" },
];

const ProductFilters = ({
	filters,
	onChange,
	onClear,
	showCategory = true,
	compact = false,
}) => {
	return (
		<div
			className={`rounded-3xl border border-nova-line/80 bg-white/90 p-5 shadow-card backdrop-blur-sm ${
				compact ? "" : "mb-8"
			}`}
		>
			<div className="mb-4 flex items-center gap-2 text-nova-ink">
				<span className="flex h-8 w-8 items-center justify-center rounded-xl bg-nova-glow text-nova-accent">
					<SlidersHorizontal size={16} />
				</span>
				<h3 className="font-semibold">Search & Filters</h3>
			</div>

			<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
				<div className="relative lg:col-span-2">
					<Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-nova-muted" />
					<input
						type="text"
						value={filters.search || ""}
						onChange={(e) => onChange({ search: e.target.value, page: 1 })}
						placeholder="Search products..."
						className="nova-input pl-10"
					/>
				</div>

				{showCategory && (
					<select
						value={filters.category || "all"}
						onChange={(e) => onChange({ category: e.target.value, page: 1 })}
						className="nova-input"
					>
						<option value="all">All categories</option>
						{(filters?.availableCategories || []).map((cat) => {
							const value = typeof cat === "string" ? cat : cat.name || cat.slug;
							const label =
								typeof cat === "string"
									? cat
									: cat.label || cat.name || cat.slug;
							return (
								<option key={value} value={value}>
									{label}
								</option>
							);
						})}
					</select>
				)}

				<select
					value={filters.sort || "newest"}
					onChange={(e) => onChange({ sort: e.target.value, page: 1 })}
					className="nova-input"
				>
					{SORT_OPTIONS.map((opt) => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</select>

				<button type="button" onClick={onClear} className="nova-btn-outline !py-3">
					<X size={14} />
					Clear
				</button>
			</div>

			<div className="mt-3 grid gap-3 sm:grid-cols-2">
				<input
					type="number"
					min="0"
					value={filters.minPrice ?? ""}
					onChange={(e) => onChange({ minPrice: e.target.value, page: 1 })}
					placeholder={`Min price${
						filters.priceRange?.min != null ? ` (from ${filters.priceRange.min})` : ""
					}`}
					className="nova-input"
				/>
				<input
					type="number"
					min="0"
					value={filters.maxPrice ?? ""}
					onChange={(e) => onChange({ maxPrice: e.target.value, page: 1 })}
					placeholder={`Max price${
						filters.priceRange?.max != null ? ` (up to ${filters.priceRange.max})` : ""
					}`}
					className="nova-input"
				/>
			</div>
		</div>
	);
};

export default ProductFilters;
