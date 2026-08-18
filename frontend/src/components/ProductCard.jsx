import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { Heart, Loader2, ShoppingCart, Star } from "lucide-react";
import { useUserStore } from "../stores/useUserStore";
import { useCartStore } from "../stores/useCartStore";
import { useWishlistStore } from "../stores/useWishlistStore";
import ProductImage from "./ProductImage";

const ProductCard = ({ product }) => {
	const { user } = useUserStore();
	const { addToCart, addingToCart, addingProductId } = useCartStore();
	const { toggleWishlist, isInWishlist } = useWishlistStore();
	const imageCount = product.images?.length || (product.image ? 1 : 0);
	const outOfStock = (product.stock ?? 0) <= 0;
	const liked = isInWishlist(product._id);
	const needsOptions =
		(product.sizes?.length || 0) > 0 ||
		(product.colors?.length || 0) > 0 ||
		(product.styles?.length || 0) > 0;
	const isAdding = addingToCart && addingProductId === product._id;

	const handleAddToCart = async (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (outOfStock) {
			toast.error("Out of stock");
			return;
		}
		if (needsOptions) {
			toast.error("Open product to choose size / color / style");
			return;
		}
		await addToCart(product);
	};

	const handleWishlist = async (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (!user) {
			toast.error("Please login to use wishlist");
			return;
		}
		await toggleWishlist(product._id);
	};

	return (
		<Link
			to={`/product/${product._id}`}
			className="group flex w-full flex-col overflow-hidden rounded-[1.5rem] border border-nova-line/70 bg-white shadow-card transition duration-500 hover:-translate-y-1.5 hover:border-nova-accent/30 hover:shadow-soft"
		>
			<div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-b from-slate-100 to-slate-50">
				<ProductImage
					className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-110"
					src={product.images?.[0] || product.image}
					alt={product.name}
				/>
				<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-nova-ink/25 via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />

				{outOfStock ? (
					<span className="absolute left-3 top-3 rounded-full bg-red-500/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
						Out of stock
					</span>
				) : imageCount > 1 ? (
					<span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-nova-ink shadow-sm backdrop-blur">
						{imageCount} photos
					</span>
				) : null}

				<button
					type="button"
					onClick={handleWishlist}
					className="absolute right-3 top-3 rounded-full bg-white/95 p-2.5 shadow-md ring-1 ring-black/5 transition hover:scale-110"
					title={liked ? "Remove from wishlist" : "Add to wishlist"}
				>
					<Heart
						size={17}
						className={liked ? "fill-rose-500 text-rose-500" : "text-nova-muted"}
					/>
				</button>

				<div className="absolute inset-x-3 bottom-3 translate-y-3 opacity-0 transition duration-400 group-hover:translate-y-0 group-hover:opacity-100">
					<button
						type="button"
						disabled={outOfStock || isAdding}
						className="flex w-full items-center justify-center gap-2 rounded-2xl bg-nova-ink/95 px-4 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur disabled:opacity-50"
						onClick={handleAddToCart}
					>
						{isAdding ? (
							<>
								<Loader2 size={16} className="animate-spin" />
								Adding...
							</>
						) : (
							<>
								<ShoppingCart size={16} />
								{outOfStock
									? "Out of stock"
									: needsOptions
										? "Select options"
										: "Quick add"}
							</>
						)}
					</button>
				</div>
			</div>

			<div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
				{product.category && (
					<p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-nova-accent">
						{product.category}
					</p>
				)}
				<h5 className="line-clamp-2 text-[15px] font-semibold leading-snug text-nova-ink">
					{product.name}
				</h5>
				<div className="mt-2 flex items-center gap-2 text-xs text-nova-muted">
					<span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 ring-1 ring-amber-100">
						<Star size={11} className="fill-amber-400 text-amber-400" />
						{Number(product.averageRating || 0).toFixed(1)}
					</span>
					<span>({product.numReviews || 0})</span>
					<span className="text-slate-300">·</span>
					<span>{outOfStock ? "Sold out" : `${product.stock ?? 0} left`}</span>
				</div>
				{needsOptions && (
					<p className="mt-2 text-xs text-nova-muted">
						{[
							product.sizes?.length && `${product.sizes.length} sizes`,
							product.colors?.length && `${product.colors.length} colors`,
							product.styles?.length && `${product.styles.length} styles`,
						]
							.filter(Boolean)
							.join(" · ")}
					</p>
				)}
				<div className="mt-auto flex items-end justify-between gap-2 pt-3">
					<p className="font-display text-2xl font-bold tracking-tight text-nova-ink">
						₹{product.price}
					</p>
					<span className="mb-1 text-xs font-medium text-nova-muted opacity-0 transition group-hover:opacity-100">
						View →
					</span>
				</div>
			</div>
		</Link>
	);
};

export default ProductCard;
