import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
	Heart,
	ImagePlus,
	Loader2,
	MessageSquare,
	ShoppingCart,
	Star,
	Trash2,
	X,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "../lib/axios";
import ProductImage from "../components/ProductImage";
import ProductImageZoom from "../components/ProductImageZoom";
import { useUserStore } from "../stores/useUserStore";
import { useCartStore } from "../stores/useCartStore";
import { useWishlistStore } from "../stores/useWishlistStore";
import {
	availableColors,
	availableSizes,
	availableStyles,
	getVariantStock,
} from "../utils/variant.utils";
import { getRatingStyle } from "../utils/rating.utils";

const MAX_REVIEW_IMAGES = 5;

const sameId = (a, b) => a?.toString() === b?.toString();

const ProductDetailPage = () => {
	const { id } = useParams();
	const { user } = useUserStore();
	const { addToCart, addingToCart, addingProductId } = useCartStore();
	const { toggleWishlist, isInWishlist } = useWishlistStore();

	const [product, setProduct] = useState(null);
	const [reviews, setReviews] = useState([]);
	const [loading, setLoading] = useState(true);
	const [activeIndex, setActiveIndex] = useState(0);
	const [rating, setRating] = useState(5);
	const [comment, setComment] = useState("");
	const [reviewImages, setReviewImages] = useState([]);
	const [submitting, setSubmitting] = useState(false);
	const [lightbox, setLightbox] = useState(null);
	const [selectedSize, setSelectedSize] = useState("");
	const [selectedColor, setSelectedColor] = useState("");
	const [selectedStyle, setSelectedStyle] = useState("");
	const [replyDrafts, setReplyDrafts] = useState({});
	const [savingReplyId, setSavingReplyId] = useState("");

	const loadProduct = async () => {
		const res = await axios.get(`/products/${id}`);
		const data = res.data;
		setProduct(data);
		setActiveIndex(0);

		const sizes = availableSizes(data);
		const size = sizes[0] || data.sizes?.[0] || "";
		const colors = availableColors(data, { size });
		const color = colors[0] || data.colors?.[0] || "";
		const styles = availableStyles(data);
		const style = styles[0] || data.styles?.[0] || "";
		setSelectedSize(size);
		setSelectedColor(color);
		setSelectedStyle(style);
	};

	const loadReviews = async () => {
		const res = await axios.get(`/reviews/product/${id}`);
		setReviews(res.data.reviews || []);
	};

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			try {
				await Promise.all([loadProduct(), loadReviews()]);
			} catch (error) {
				toast.error(error.response?.data?.message || "Product not found");
				setProduct(null);
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [id]);

	useEffect(() => {
		if (!user) {
			setRating(5);
			setComment("");
			setReviewImages([]);
			return;
		}
		const existing = reviews.find((r) => sameId(r.user?._id, user._id));
		if (existing) {
			setRating(existing.rating);
			setComment(existing.comment || "");
			setReviewImages(existing.images || []);
		} else {
			setRating(5);
			setComment("");
			setReviewImages([]);
		}
	}, [reviews, user]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center text-nova-muted">
				Loading product...
			</div>
		);
	}

	if (!product) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center gap-4 text-nova-muted">
				<p>Product not found</p>
				<Link to="/shop" className="text-nova-accent hover:underline">
					Back to Shop
				</Link>
			</div>
		);
	}

	const images =
		product.images?.length > 0
			? product.images
			: product.image
				? [product.image]
				: [];
	const activeImage = images[activeIndex] || images[0];
	const selection = {
		size: selectedSize,
		color: selectedColor,
		style: selectedStyle,
	};
	const variantStock = getVariantStock(product, selection);
	const outOfStock = (product.stock ?? 0) <= 0 || variantStock <= 0;
	const liked = isInWishlist(product._id);
	const myReview = reviews.find((r) => sameId(r.user?._id, user?._id));
	const isAdding = addingToCart && addingProductId === product._id;
	const productRatingStyle = getRatingStyle(product.averageRating);
	const formRatingStyle = getRatingStyle(rating);

	const sizeOptions = product.sizes || [];
	const colorOptions = product.colors || [];
	const styleOptions = product.styles || [];
	const inStockSizes = availableSizes(product, { color: selectedColor });
	const inStockColors = availableColors(product, { size: selectedSize });
	const styleOptionsList = availableStyles(product);

	const handleAddToCart = async () => {
		if (variantStock <= 0) {
			toast.error("Selected size/color/style is out of stock");
			return;
		}
		if (product.sizes?.length && !selectedSize) {
			toast.error("Please select a size");
			return;
		}
		if (product.colors?.length && !selectedColor) {
			toast.error("Please select a color");
			return;
		}
		if (product.styles?.length && !selectedStyle) {
			toast.error("Please select a style");
			return;
		}
		await addToCart(product, selection);
	};

	const handleWishlist = async () => {
		if (!user) {
			toast.error("Please login to use wishlist");
			return;
		}
		await toggleWishlist(product._id);
	};

	const handleReviewImagesChange = (e) => {
		const files = Array.from(e.target.files || []);
		e.target.value = "";
		if (files.length === 0) return;

		const remaining = MAX_REVIEW_IMAGES - reviewImages.length;
		if (remaining <= 0) {
			toast.error(`Maximum ${MAX_REVIEW_IMAGES} photos allowed`);
			return;
		}

		const selected = files.slice(0, remaining);
		Promise.all(
			selected.map(
				(file) =>
					new Promise((resolve, reject) => {
						if (!file.type.startsWith("image/")) {
							reject(new Error("Only image files are allowed"));
							return;
						}
						if (file.size > 5 * 1024 * 1024) {
							reject(new Error("Each image must be under 5MB"));
							return;
						}
						const reader = new FileReader();
						reader.onloadend = () => resolve(reader.result);
						reader.onerror = () => reject(new Error("Failed to read image"));
						reader.readAsDataURL(file);
					})
			)
		)
			.then((uploaded) => {
				setReviewImages((prev) => [...prev, ...uploaded]);
			})
			.catch((error) => toast.error(error.message));
	};

	const removeReviewImage = (index) => {
		setReviewImages((prev) => prev.filter((_, i) => i !== index));
	};

	const handleSubmitReview = async (e) => {
		e.preventDefault();
		if (!user) {
			toast.error("Please login to write a review");
			return;
		}
		if (!comment.trim()) {
			toast.error("Please write a comment");
			return;
		}

		setSubmitting(true);
		try {
			const payload = {
				rating,
				comment,
				images: reviewImages,
			};

			if (myReview) {
				const res = await axios.put(`/reviews/${myReview._id}`, payload);
				toast.success("Review updated");
				setProduct((prev) => ({
					...prev,
					averageRating: res.data.averageRating,
					numReviews: res.data.numReviews,
				}));
			} else {
				const res = await axios.post(`/reviews/product/${id}`, payload);
				toast.success("Review submitted");
				setProduct((prev) => ({
					...prev,
					averageRating: res.data.averageRating,
					numReviews: res.data.numReviews,
				}));
			}
			await loadReviews();
		} catch (error) {
			toast.error(error.response?.data?.message || "Failed to submit review");
		} finally {
			setSubmitting(false);
		}
	};


	const handleReplyDraftChange = (reviewId, value) => {
		setReplyDrafts((prev) => ({ ...prev, [reviewId]: value }));
	};

	const handleSaveReply = async (review, overrideComment) => {
		const draft = overrideComment ?? replyDrafts[review._id] ?? "";
		if (overrideComment === undefined && !draft.trim()) {
			toast.error("Please write a reply");
			return;
		}

		setSavingReplyId(review._id);
		try {
			const res = await axios.put(`/reviews/${review._id}/reply`, {
				comment: draft,
			});
			setReviews((prev) =>
				prev.map((item) => (item._id === review._id ? res.data.review : item))
			);
			setReplyDrafts((prev) => ({
				...prev,
				[review._id]: "",
			}));
			toast.success(draft.trim() ? "Reply saved" : "Reply removed");
		} catch (error) {
			toast.error(error.response?.data?.message || "Failed to save reply");
		} finally {
			setSavingReplyId("");
		}
	};
	const handleDeleteReview = async (reviewId) => {
		try {
			const res = await axios.delete(`/reviews/${reviewId}`);
			toast.success("Review deleted");
			setProduct((prev) => ({
				...prev,
				averageRating: res.data.averageRating,
				numReviews: res.data.numReviews,
			}));
			await loadReviews();
		} catch (error) {
			toast.error(error.response?.data?.message || "Failed to delete review");
		}
	};

	return (
		<div className="nova-container py-10">
			<div className="mx-auto max-w-6xl">
				<Link
					to="/shop"
					className="mb-6 inline-flex items-center gap-2 text-sm text-nova-muted hover:text-nova-accent"
				>
					<ArrowLeft size={16} />
					Back to Shop
				</Link>

				<motion.div
					className="nova-card grid gap-8 overflow-visible p-4 sm:p-6 lg:grid-cols-2"
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
				>
					<div>
						<ProductImageZoom
							src={activeImage}
							alt={product.name}
							onOpen={(src) => setLightbox(src)}
						>
							{images.length > 1 && (
								<>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											setActiveIndex((prev) =>
												prev === 0 ? images.length - 1 : prev - 1
											);
										}}
										className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/95 p-2 text-nova-ink shadow-md ring-1 ring-black/5 hover:bg-white"
									>
										<ChevronLeft size={20} />
									</button>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											setActiveIndex((prev) =>
												prev === images.length - 1 ? 0 : prev + 1
											);
										}}
										className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/95 p-2 text-nova-ink shadow-md ring-1 ring-black/5 hover:bg-white"
									>
										<ChevronRight size={20} />
									</button>
								</>
							)}
						</ProductImageZoom>

						{images.length > 1 && (
							<div className="mt-3 grid grid-cols-4 sm:grid-cols-6 gap-2">
								{images.map((src, index) => (
									<button
										key={`${src}-${index}`}
										type="button"
										onClick={() => setActiveIndex(index)}
										className={`aspect-square rounded-md overflow-hidden border-2 ${
											index === activeIndex
												? "border-nova-accent"
												: "border-transparent opacity-70 hover:opacity-100"
										}`}
									>
										<ProductImage
											src={src}
											alt={`${product.name} ${index + 1}`}
											className="w-full h-full object-cover"
										/>
									</button>
								))}
							</div>
						)}
					</div>

					<div className="flex flex-col">
						<p className="mb-2 text-sm font-medium uppercase tracking-wider text-nova-accent">
							{product.category}
						</p>
						<h1 className="mb-3 font-display text-3xl font-bold text-nova-ink sm:text-4xl">
							{product.name}
						</h1>

						<div className="flex items-center gap-3 mb-3 text-sm text-nova-muted">
							<span className={`inline-flex items-center gap-1 ${productRatingStyle.text}`}>
								<Star size={16} className={productRatingStyle.star} />
								{Number(product.averageRating || 0).toFixed(1)} ({product.numReviews || 0}{" "}
								reviews)
							</span>
							<span className={outOfStock ? "text-red-400" : "text-nova-accent"}>
								{outOfStock
									? "Out of stock"
									: `${variantStock} left for this option`}
							</span>
						</div>

						<p className="mb-4 font-display text-3xl font-bold text-nova-ink">
							₹{Number(product.price).toFixed(2)}
						</p>
						<p className="text-nova-muted leading-relaxed mb-6">{product.description}</p>

						<div className="space-y-4 mb-6">
							{sizeOptions.length > 0 && (
								<div>
									<p className="text-sm text-nova-muted mb-2">Size</p>
									<div className="flex flex-wrap gap-2">
										{sizeOptions.map((size) => {
											const inStock = inStockSizes.includes(size);
											return (
												<button
													key={size}
													type="button"
													disabled={!inStock}
													onClick={() => setSelectedSize(size)}
													className={`px-3 py-1.5 rounded-md text-sm border ${
														selectedSize === size
															? "border-nova-accent bg-nova-glow text-nova-accent"
															: inStock
																? "border-nova-line text-nova-muted hover:border-nova-accent"
																: "border-nova-line text-gray-600 line-through cursor-not-allowed"
													}`}
												>
													{size}
													{!inStock ? " (OOS)" : ""}
												</button>
											);
										})}
									</div>
								</div>
							)}
							{colorOptions.length > 0 && (
								<div>
									<p className="text-sm text-nova-muted mb-2">Color</p>
									<div className="flex flex-wrap gap-2">
										{colorOptions.map((color) => {
											const inStock = inStockColors.includes(color);
											return (
												<button
													key={color}
													type="button"
													disabled={!inStock}
													onClick={() => setSelectedColor(color)}
													className={`px-3 py-1.5 rounded-md text-sm border ${
														selectedColor === color
															? "border-nova-accent bg-nova-glow text-nova-accent"
															: inStock
																? "border-nova-line text-nova-muted hover:border-nova-accent"
																: "border-nova-line text-gray-600 line-through cursor-not-allowed"
													}`}
												>
													{color}
													{!inStock ? " (OOS)" : ""}
												</button>
											);
										})}
									</div>
								</div>
							)}
							{styleOptions.length > 0 && (
								<div>
									<p className="text-sm text-nova-muted mb-2">Style</p>
									<div className="flex flex-wrap gap-2">
										{styleOptionsList.map((style) => (
											<button
												key={style}
												type="button"
												onClick={() => setSelectedStyle(style)}
												className={`px-3 py-1.5 rounded-md text-sm border ${
													selectedStyle === style
														? "border-nova-accent bg-nova-glow text-nova-accent"
														: "border-nova-line text-nova-muted hover:border-nova-accent"
												}`}
											>
												{style}
											</button>
										))}
									</div>
								</div>
							)}
						</div>

						<div className="flex flex-col sm:flex-row gap-3 mt-auto">
							<button
								type="button"
								onClick={handleAddToCart}
								disabled={outOfStock || isAdding}
								className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-nova-accent hover:bg-nova-accent-dark px-5 py-3 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isAdding ? (
									<>
										<Loader2 size={20} className="animate-spin" />
										Adding...
									</>
								) : (
									<>
										<ShoppingCart size={20} />
										{outOfStock ? "Out of stock" : "Add to cart"}
									</>
								)}
							</button>
							<button
								type="button"
								onClick={handleWishlist}
								className="inline-flex items-center justify-center gap-2 rounded-lg bg-nova-bg hover:bg-nova-glow px-5 py-3 text-nova-ink font-medium"
							>
								<Heart
									size={18}
									className={liked ? "fill-red-500 text-red-500" : ""}
								/>
								{liked ? "Wishlisted" : "Wishlist"}
							</button>
						</div>
					</div>
				</motion.div>

				{/* Reviews */}
				<div className="nova-card mt-8 p-4 sm:p-6">
					<h2 className="mb-4 font-display text-xl font-bold text-nova-ink">
						Customer Reviews
					</h2>

					{user ? (
						<form
							onSubmit={handleSubmitReview}
							className="mb-8 space-y-3 border border-nova-accent/30 bg-nova-bg rounded-lg p-4"
						>
							<p className="text-sm font-medium text-nova-accent">
								{myReview ? "Update your review" : "Write a review"}
								<span className="ml-2 text-nova-muted font-normal">
									(logged in as {user.name}
									{user.role === "admin" ? " · admin" : ""})
								</span>
							</p>
							<div className="flex flex-wrap items-center gap-3">
								<label className="text-sm text-nova-muted">Your rating</label>
								<div className="flex items-center gap-1">
									{[1, 2, 3, 4, 5].map((n) => {
										const active = rating >= n;
										return (
											<button
												key={n}
												type="button"
												onClick={() => setRating(n)}
												className="rounded-md p-1 transition"
												aria-label={`${n} star${n > 1 ? "s" : ""}`}
											>
												<Star
													size={22}
													className={
														active ? formRatingStyle.star : "fill-slate-200 text-slate-300"
													}
												/>
											</button>
										);
									})}
								</div>
								<span className={`text-sm font-semibold ${formRatingStyle.text}`}>
									{rating} {rating === 1 ? "star" : "stars"}
								</span>
							</div>
							<textarea
								value={comment}
								onChange={(e) => setComment(e.target.value)}
								rows={3}
								placeholder={
									myReview
										? "Update your review..."
										: "Share your experience with this product..."
								}
								className="w-full bg-nova-bg border border-nova-line rounded-md px-3 py-2 text-sm text-nova-ink placeholder:text-nova-muted"
							/>

							<div>
								<label className="inline-flex items-center gap-2 cursor-pointer text-sm text-nova-muted hover:text-nova-accent">
									<ImagePlus size={16} />
									Add photos ({reviewImages.length}/{MAX_REVIEW_IMAGES})
									<input
										type="file"
										accept="image/*"
										multiple
										className="hidden"
										onChange={handleReviewImagesChange}
									/>
								</label>
								{reviewImages.length > 0 && (
									<div className="mt-3 flex flex-wrap gap-2">
										{reviewImages.map((src, index) => (
											<div
												key={`${index}-${src.slice(0, 24)}`}
												className="relative w-20 h-20 rounded-md overflow-hidden border border-nova-line"
											>
												<img
													src={src}
													alt={`Review ${index + 1}`}
													className="w-full h-full object-cover"
												/>
												<button
													type="button"
													onClick={() => removeReviewImage(index)}
													className="absolute top-1 right-1 bg-white/95 rounded-full p-0.5 text-nova-ink hover:bg-red-600"
												>
													<X size={12} />
												</button>
											</div>
										))}
									</div>
								)}
							</div>

							<button
								type="submit"
								disabled={submitting}
								className="bg-nova-accent hover:bg-nova-accent-dark disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm"
							>
								{submitting
									? "Saving..."
									: myReview
										? "Update Review"
										: "Submit Review"}
							</button>
						</form>
					) : (
						<div className="mb-6 rounded-lg border border-nova-line bg-nova-bg p-4 text-sm text-nova-muted">
							Want to leave a review?{" "}
							<Link to="/login" className="text-nova-accent hover:underline">
								Login as customer
							</Link>{" "}
							pehle — har logged-in user (admin ya customer) review likh sakta hai.
						</div>
					)}

					{reviews.length === 0 ? (
						<p className="text-nova-muted text-sm">No reviews yet. Be the first!</p>
					) : (
						<div className="space-y-4">
							{reviews.map((review) => (
								<div
									key={review._id}
									className="border border-nova-line rounded-lg p-4 bg-nova-bg"
								>
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="font-medium text-nova-ink">
												{review.user?.name || "User"}
											</p>
											<p className={`text-xs mt-1 ${getRatingStyle(review.rating).text}`}>
												{"★".repeat(review.rating)}
												{"☆".repeat(5 - review.rating)}
											</p>
										</div>
										{(sameId(user?._id, review.user?._id) ||
											user?.role === "admin") && (
											<button
												type="button"
												onClick={() => handleDeleteReview(review._id)}
												className="text-red-400 hover:text-red-300"
											>
												<Trash2 size={16} />
											</button>
										)}
									</div>
									<p className="text-sm text-nova-muted mt-2">{review.comment}</p>
									{review.images?.length > 0 && (
										<div className="mt-3 flex flex-wrap gap-2">
											{review.images.map((src, index) => (
												<button
													key={`${review._id}-${index}`}
													type="button"
													onClick={() => setLightbox(src)}
													className="w-20 h-20 rounded-md overflow-hidden border border-nova-line hover:border-nova-accent"
												>
													<img
														src={src}
														alt={`Review photo ${index + 1}`}
														className="w-full h-full object-cover"
													/>
												</button>
											))}
										</div>
									)}
									{review.adminReply?.comment && (
										<div className="mt-3 rounded-md border border-nova-accent/30 bg-nova-glow p-3">
											<p className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-nova-accent">
												<MessageSquare size={14} /> Admin reply
											</p>
											<p className="text-sm text-nova-ink">{review.adminReply.comment}</p>
											{review.adminReply.repliedAt && (
												<p className="mt-2 text-xs text-nova-muted">
													{review.adminReply.repliedBy?.name || "Admin"} replied on {new Date(review.adminReply.repliedAt).toLocaleDateString()}
												</p>
											)}
										</div>
									)}
									{user?.role === "admin" && (
										<div className="mt-3 rounded-md border border-nova-line bg-white/60 p-3">
											<label className="mb-2 block text-xs font-medium text-nova-muted">
												Reply as admin
											</label>
											<textarea
												value={replyDrafts[review._id] ?? ""}
												onChange={(e) => handleReplyDraftChange(review._id, e.target.value)}
												rows={2}
												placeholder={review.adminReply?.comment ? "Write a new reply to update it..." : "Write a reply for this customer review..."}
												className="w-full rounded-md border border-nova-line bg-nova-bg px-3 py-2 text-sm text-nova-ink placeholder:text-nova-muted"
											/>
											<div className="mt-2 flex flex-wrap gap-2">
												<button
													type="button"
													onClick={() => handleSaveReply(review)}
													disabled={savingReplyId === review._id}
													className="rounded-md bg-nova-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-nova-accent-dark disabled:opacity-50"
												>
													{savingReplyId === review._id ? "Saving..." : "Save Reply"}
												</button>
												{review.adminReply?.comment && (
													<button
														type="button"
														onClick={() => handleSaveReply(review, "")}
														disabled={savingReplyId === review._id}
														className="rounded-md border border-nova-line px-3 py-1.5 text-xs font-medium text-nova-muted hover:text-red-400 disabled:opacity-50"
													>
														Remove Reply
													</button>
												)}
											</div>
										</div>
									)}
									<p className="text-xs text-nova-muted mt-2">
										{new Date(review.createdAt).toLocaleDateString()}
									</p>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{lightbox && (
				<button
					type="button"
					className="fixed inset-0 z-[100] bg-nova-ink/80 flex items-center justify-center p-4"
					onClick={() => setLightbox(null)}
				>
					<img
						src={lightbox}
						alt="Zoomed product"
						className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
					/>
				</button>
			)}
		</div>
	);
};

export default ProductDetailPage;
