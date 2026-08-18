import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trash, Star, Pencil, Search } from "lucide-react";
import { useProductStore } from "../stores/useProductStore";
import ProductImage from "./ProductImage";

const ProductsList = ({ onEdit }) => {
	const { deleteProduct, toggleFeaturedProduct, products, seedFullCatalog, loading } =
		useProductStore();
	const [search, setSearch] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("all");

	const categories = useMemo(() => {
		const set = new Set(
			(products || [])
				.map((p) => p.category)
				.filter(Boolean)
				.map((c) => String(c).toLowerCase())
		);
		return Array.from(set).sort();
	}, [products]);

	const filteredProducts = useMemo(() => {
		const term = search.trim().toLowerCase();
		return (products || []).filter((product) => {
			const matchesSearch =
				!term ||
				product.name?.toLowerCase().includes(term) ||
				product.category?.toLowerCase().includes(term) ||
				product.description?.toLowerCase().includes(term);

			const matchesCategory =
				categoryFilter === "all" ||
				product.category?.toLowerCase() === categoryFilter.toLowerCase();

			return matchesSearch && matchesCategory;
		});
	}, [products, search, categoryFilter]);

	const handleDelete = (productId) => {
		if (window.confirm("Are you sure you want to delete this product?")) {
			deleteProduct(productId);
		}
	};

	return (
		<motion.div
			className="bg-gray-800 shadow-lg rounded-lg overflow-hidden max-w-5xl mx-auto"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.8 }}
		>
			<div className="p-4 border-b border-gray-700 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
				<div>
					<h3 className="text-lg font-semibold text-emerald-300">All Products</h3>
					<p className="text-xs text-gray-400 mt-1">
						Showing {filteredProducts.length} of {products?.length || 0}
					</p>
				</div>

				<div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
					<button
						type="button"
						onClick={() => {
							if (
								window.confirm(
									"This replaces all products with a full catalog (categories, colors, sizes, stock). Continue?"
								)
							) {
								seedFullCatalog();
							}
						}}
						disabled={loading}
						className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
					>
						Load full catalog
					</button>
					<div className="relative flex-1 sm:w-72">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
						<input
							type="search"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search product to edit..."
							className="w-full bg-gray-700 border border-gray-600 rounded-md pl-9 pr-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
						/>
					</div>
					<select
						value={categoryFilter}
						onChange={(e) => setCategoryFilter(e.target.value)}
						className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white"
					>
						<option value="all">All categories</option>
						{categories.map((cat) => (
							<option key={cat} value={cat}>
								{cat}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-700">
					<thead className="bg-gray-700">
						<tr>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
								Product
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
								Price
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
								Category
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
								Stock
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
								Images
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
								Featured
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
								Actions
							</th>
						</tr>
					</thead>

					<tbody className="bg-gray-800 divide-y divide-gray-700">
						{filteredProducts.length === 0 && (
							<tr>
								<td colSpan={7} className="px-6 py-10 text-center text-gray-400">
									No products match your search
								</td>
							</tr>
						)}

						{filteredProducts.map((product) => (
							<tr key={product._id} className="hover:bg-gray-700">
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="flex items-center">
										<div className="flex-shrink-0 h-10 w-10">
											<ProductImage
												className="h-10 w-10 rounded-full object-cover"
												src={product.images?.[0] || product.image}
												alt={product.name}
											/>
										</div>
										<div className="ml-4">
											<div className="text-sm font-medium text-white">{product.name}</div>
										</div>
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-sm text-gray-300">₹{product.price.toFixed(2)}</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-sm text-gray-300">{product.category}</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div
										className={`text-sm ${
											(product.stock ?? 0) <= 0
												? "text-red-400"
												: (product.stock ?? 0) < 10
													? "text-amber-400"
													: "text-gray-300"
										}`}
									>
										{product.stock ?? 0}
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-sm text-gray-300">{product.images?.length || 0}</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<button
										onClick={() => toggleFeaturedProduct(product._id)}
										className={`p-1 rounded-full ${
											product.isFeatured
												? "bg-yellow-400 text-gray-900"
												: "bg-gray-600 text-gray-300"
										} hover:bg-yellow-500 transition-colors duration-200`}
									>
										<Star className="h-5 w-5" />
									</button>
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center gap-2">
									<button
										onClick={() => onEdit?.(product)}
										className="text-emerald-400 hover:text-emerald-300"
										title="Edit product / images"
									>
										<Pencil className="h-5 w-5" />
									</button>
									<button
										onClick={() => handleDelete(product._id)}
										className="text-red-400 hover:text-red-300"
									>
										<Trash className="h-5 w-5" />
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</motion.div>
	);
};
export default ProductsList;
