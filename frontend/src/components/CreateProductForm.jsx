import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PlusCircle, Upload, Loader, Pencil, X } from "lucide-react";
import toast from "react-hot-toast";
import { useProductStore } from "../stores/useProductStore";
import ProductImage from "./ProductImage";
import { buildVariantsFromOptions } from "../utils/variant.utils";

const emptyProduct = {
	name: "",
	description: "",
	price: "",
	category: "",
	stock: "5",
	sizesText: "S, M, L, XL",
	colorsText: "Black, White, Blue",
	stylesText: "Regular, Casual",
	variants: [],
	image: "",
	images: [],
};

const parseOptions = (text) =>
	String(text || "")
		.split(",")
		.map((v) => v.trim())
		.filter(Boolean);

const CreateProductForm = ({
	editingProduct,
	clearEditingProduct,
	onSaveSuccess,
}) => {
	const [newProduct, setNewProduct] = useState(emptyProduct);
	const [useCustomCategory, setUseCustomCategory] = useState(false);
	const { createProduct, updateProduct, loading, categories, fetchCategories } =
		useProductStore();

	useEffect(() => {
		fetchCategories();
	}, [fetchCategories]);

	useEffect(() => {
		if (editingProduct) {
			const images = editingProduct.images?.length
				? editingProduct.images
				: editingProduct.image
					? [editingProduct.image]
					: [];
			const existingCategory = editingProduct.category || "";
			const known = categories.some(
				(c) => (c.name || c.slug) === existingCategory.toLowerCase()
			);
			setUseCustomCategory(Boolean(existingCategory) && !known);
			const sizesText = (editingProduct.sizes || []).join(", ");
			const colorsText = (editingProduct.colors || []).join(", ");
			const stylesText = (editingProduct.styles || []).join(", ");
			setNewProduct({
				name: editingProduct.name || "",
				description: editingProduct.description || "",
				price: editingProduct.price || "",
				category: existingCategory,
				stock: "5",
				sizesText,
				colorsText,
				stylesText,
				variants:
					editingProduct.variants?.length > 0
						? editingProduct.variants.map((v) => ({
								size: v.size || "",
								color: v.color || "",
								stock: Number(v.stock) || 0,
						  }))
						: buildVariantsFromOptions(
								editingProduct.sizes || [],
								editingProduct.colors || [],
								5,
								[]
						  ),
				image: images[0] || "",
				images,
			});
		} else {
			setUseCustomCategory(false);
			setNewProduct({
				...emptyProduct,
				variants: buildVariantsFromOptions(
					parseOptions(emptyProduct.sizesText),
					parseOptions(emptyProduct.colorsText),
					5,
					[]
				),
			});
		}
	}, [editingProduct, categories]);

	const rebuildVariants = (sizesText, colorsText, defaultStock, existing) =>
		buildVariantsFromOptions(
			parseOptions(sizesText),
			parseOptions(colorsText),
			defaultStock,
			existing
		);

	const totalStock = useMemo(
		() => (newProduct.variants || []).reduce((s, v) => s + (Number(v.stock) || 0), 0),
		[newProduct.variants]
	);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!newProduct.images?.length) {
			toast.error("Please add at least one product image");
			return;
		}
		if (!newProduct.category?.trim()) {
			toast.error("Please select or enter a category");
			return;
		}

		try {
			const payload = {
				name: newProduct.name,
				description: newProduct.description,
				price: newProduct.price,
				category: newProduct.category.trim().toLowerCase(),
				image: newProduct.images[0],
				images: newProduct.images,
				sizes: parseOptions(newProduct.sizesText),
				colors: parseOptions(newProduct.colorsText),
				styles: parseOptions(newProduct.stylesText),
				variants: newProduct.variants,
			};
			if (editingProduct) {
				await updateProduct(editingProduct._id, payload);
				clearEditingProduct();
			} else {
				await createProduct(payload);
			}
			onSaveSuccess?.();
			setUseCustomCategory(false);
			setNewProduct({
				...emptyProduct,
				variants: buildVariantsFromOptions(
					parseOptions(emptyProduct.sizesText),
					parseOptions(emptyProduct.colorsText),
					5,
					[]
				),
			});
		} catch {
			console.log("error saving product");
		}
	};

	const handleImageChange = (e) => {
		const files = Array.from(e.target.files || []);
		e.target.value = "";
		if (files.length === 0) return;

		Promise.all(
			files.map(
				(file) =>
					new Promise((resolve) => {
						const reader = new FileReader();
						reader.onloadend = () => resolve(reader.result);
						reader.readAsDataURL(file);
					})
			)
		).then((uploaded) => {
			setNewProduct((prev) => {
				const images = [...(prev.images || []), ...uploaded];
				return {
					...prev,
					images,
					image: images[0] || "",
				};
			});
		});
	};

	const removeImageAt = (index) => {
		setNewProduct((prev) => {
			const images = prev.images.filter((_, i) => i !== index);
			return {
				...prev,
				images,
				image: images[0] || "",
			};
		});
	};

	const setAsCover = (index) => {
		setNewProduct((prev) => {
			if (index === 0) return prev;
			const images = [...prev.images];
			const [selected] = images.splice(index, 1);
			images.unshift(selected);
			return {
				...prev,
				images,
				image: images[0],
			};
		});
	};

	const categoryOptions = categories.map((c) => c.name || c.slug);

	return (
		<motion.div
			className="bg-gray-800 shadow-lg rounded-lg p-8 mb-8 max-w-xl mx-auto"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.8 }}
		>
			<h2 className="text-2xl font-semibold mb-6 text-emerald-300">
				{editingProduct ? "Edit Product" : "Create New Product"}
			</h2>

			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label htmlFor="name" className="block text-sm font-medium text-gray-300">
						Product Name
					</label>
					<input
						type="text"
						id="name"
						name="name"
						value={newProduct.name}
						onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
						className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
						required
					/>
				</div>

				<div>
					<label htmlFor="description" className="block text-sm font-medium text-gray-300">
						Description
					</label>
					<textarea
						id="description"
						name="description"
						value={newProduct.description}
						onChange={(e) =>
							setNewProduct({ ...newProduct, description: e.target.value })
						}
						rows="3"
						className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
						required
					/>
				</div>

				<div>
					<label htmlFor="price" className="block text-sm font-medium text-gray-300">
						Price (₹)
					</label>
					<input
						type="number"
						id="price"
						name="price"
						value={newProduct.price}
						onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
						step="0.01"
						className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
						required
					/>
				</div>

				<div>
					<label htmlFor="stock" className="block text-sm font-medium text-gray-300">
						Default stock per size + color
					</label>
					<input
						type="number"
						id="stock"
						name="stock"
						min="0"
						value={newProduct.stock}
						onChange={(e) => {
							const stock = e.target.value;
							setNewProduct((prev) => ({
								...prev,
								stock,
								variants: rebuildVariants(prev.sizesText, prev.colorsText, stock, []),
							}));
						}}
						className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
					/>
					<p className="text-xs text-gray-500 mt-1">
						Total inventory: {totalStock} · Style is optional (not separate stock)
					</p>
				</div>

				<div>
					<label htmlFor="sizesText" className="block text-sm font-medium text-gray-300">
						Sizes (comma separated)
					</label>
					<input
						type="text"
						id="sizesText"
						value={newProduct.sizesText}
						onChange={(e) => {
							const sizesText = e.target.value;
							setNewProduct((prev) => ({
								...prev,
								sizesText,
								variants: rebuildVariants(
									sizesText,
									prev.colorsText,
									prev.stock,
									prev.variants
								),
							}));
						}}
						placeholder="S, M, L, XL"
						className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
					/>
				</div>

				<div>
					<label htmlFor="colorsText" className="block text-sm font-medium text-gray-300">
						Colors (comma separated)
					</label>
					<input
						type="text"
						id="colorsText"
						value={newProduct.colorsText}
						onChange={(e) => {
							const colorsText = e.target.value;
							setNewProduct((prev) => ({
								...prev,
								colorsText,
								variants: rebuildVariants(
									prev.sizesText,
									colorsText,
									prev.stock,
									prev.variants
								),
							}));
						}}
						placeholder="Black, White, Blue"
						className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
					/>
				</div>

				<div>
					<label htmlFor="stylesText" className="block text-sm font-medium text-gray-300">
						Styles (optional, comma separated)
					</label>
					<input
						type="text"
						id="stylesText"
						value={newProduct.stylesText}
						onChange={(e) =>
							setNewProduct({ ...newProduct, stylesText: e.target.value })
						}
						placeholder="Slim, Regular, Oversized"
						className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
					/>
				</div>

				{newProduct.variants?.length > 0 && (
					<div className="border border-gray-600 rounded-md overflow-hidden">
						<div className="bg-gray-700/60 px-3 py-2 text-sm text-gray-300">
							Size × Color stock ({newProduct.variants.length} rows) — set 0 = out of stock
						</div>
						<div className="max-h-56 overflow-y-auto">
							<table className="min-w-full text-sm">
								<thead className="bg-gray-700 text-gray-300 sticky top-0">
									<tr>
										<th className="px-3 py-2 text-left">Size</th>
										<th className="px-3 py-2 text-left">Color</th>
										<th className="px-3 py-2 text-left">Stock</th>
									</tr>
								</thead>
								<tbody>
									{newProduct.variants.map((variant, index) => (
										<tr
											key={`${variant.size}-${variant.color}-${index}`}
											className="border-t border-gray-700"
										>
											<td className="px-3 py-1.5 text-gray-300">
												{variant.size || "—"}
											</td>
											<td className="px-3 py-1.5 text-gray-300">
												{variant.color || "—"}
											</td>
											<td className="px-3 py-1.5">
												<input
													type="number"
													min="0"
													value={variant.stock}
													onChange={(e) => {
														const stock = Number(e.target.value);
														setNewProduct((prev) => {
															const variants = [...prev.variants];
															variants[index] = {
																...variants[index],
																stock: Number.isNaN(stock) ? 0 : Math.max(0, stock),
															};
															return { ...prev, variants };
														});
													}}
													className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white"
												/>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}

				<div>
					<div className="flex items-center justify-between mb-1">
						<label htmlFor="category" className="block text-sm font-medium text-gray-300">
							Category
						</label>
						<button
							type="button"
							onClick={() => {
								setUseCustomCategory((prev) => !prev);
								setNewProduct((prev) => ({ ...prev, category: "" }));
							}}
							className="text-xs text-emerald-400 hover:text-emerald-300"
						>
							{useCustomCategory ? "Choose existing" : "+ New category"}
						</button>
					</div>

					{useCustomCategory ? (
						<input
							type="text"
							id="category"
							name="category"
							placeholder="e.g. hoodies"
							value={newProduct.category}
							onChange={(e) =>
								setNewProduct({
									...newProduct,
									category: e.target.value.toLowerCase(),
								})
							}
							className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
							required
						/>
					) : (
						<select
							id="category"
							name="category"
							value={newProduct.category}
							onChange={(e) =>
								setNewProduct({ ...newProduct, category: e.target.value })
							}
							className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
							required
						>
							<option value="">Select a category</option>
							{categoryOptions.map((category) => (
								<option key={category} value={category}>
									{category}
								</option>
							))}
						</select>
					)}
					<p className="mt-1 text-xs text-gray-500">
						Categories are dynamic — new ones appear on Home automatically.
					</p>
				</div>

				<div>
					<div className="flex items-center gap-3">
						<input
							type="file"
							id="image"
							className="sr-only"
							accept="image/*"
							multiple
							onChange={handleImageChange}
						/>
						<label
							htmlFor="image"
							className="cursor-pointer bg-gray-700 py-2 px-3 border border-gray-600 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-300 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
						>
							<Upload className="h-5 w-5 inline-block mr-2" />
							{newProduct.images?.length ? "Add More Images" : "Upload Images"}
						</label>
						<span className="text-xs text-gray-400">
							{newProduct.images?.length || 0} image(s)
						</span>
					</div>

					{newProduct.images?.length > 0 && (
						<div className="mt-3 grid grid-cols-3 gap-3">
							{newProduct.images.map((imageSrc, index) => (
								<div
									key={`${index}-${String(imageSrc).slice(0, 24)}`}
									className="relative group"
								>
									<ProductImage
										src={imageSrc}
										alt={`preview-${index}`}
										className="h-24 w-full rounded-md object-cover border border-gray-600"
									/>
									<button
										type="button"
										onClick={() => removeImageAt(index)}
										className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 rounded-full p-1"
										title="Delete image"
									>
										<X size={14} className="text-white" />
									</button>
									{index === 0 ? (
										<span className="absolute bottom-1 left-1 text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded">
											Cover
										</span>
									) : (
										<button
											type="button"
											onClick={() => setAsCover(index)}
											className="absolute bottom-1 left-1 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100"
										>
											Set cover
										</button>
									)}
								</div>
							))}
						</div>
					)}
					<p className="mt-2 text-xs text-gray-500">
						Tip: click ✕ to delete an image. First image is the cover photo.
					</p>
				</div>

				{editingProduct && (
					<button
						type="button"
						onClick={() => {
							clearEditingProduct();
							setUseCustomCategory(false);
							setNewProduct(emptyProduct);
						}}
						className="mr-2 inline-flex items-center justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-200 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
					>
						Cancel Edit
					</button>
				)}
				<button
					type="submit"
					className="w-full inline-flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
					disabled={loading}
				>
					{loading ? (
						<>
							<Loader className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
							Saving...
						</>
					) : (
						<>
							{editingProduct ? (
								<Pencil className="mr-2 h-5 w-5" />
							) : (
								<PlusCircle className="mr-2 h-5 w-5" />
							)}
							{editingProduct ? "Update Product" : "Create Product"}
						</>
					)}
				</button>
			</form>
		</motion.div>
	);
};
export default CreateProductForm;
