import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { useWishlistStore } from "../stores/useWishlistStore";
import ProductCard from "../components/ProductCard";

const WishlistPage = () => {
	const { wishlist, fetchWishlist, loading } = useWishlistStore();

	useEffect(() => {
		fetchWishlist();
	}, [fetchWishlist]);

	return (
		<div className="nova-container py-10">
			<div className="mb-8">
				<p className="text-sm font-medium uppercase tracking-wider text-nova-accent">
					Saved
				</p>
				<div className="mt-1 flex items-center gap-2">
					<Heart className="text-nova-accent" size={22} />
					<h1 className="font-display text-3xl font-bold text-nova-ink">My Wishlist</h1>
				</div>
			</div>

			{loading && wishlist.length === 0 ? (
				<p className="text-nova-muted">Loading wishlist...</p>
			) : wishlist.length === 0 ? (
				<div className="nova-card p-10 text-center">
					<p className="mb-4 text-nova-muted">Your wishlist is empty.</p>
					<Link to="/shop" className="nova-btn inline-flex">
						Browse Products
					</Link>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{wishlist.map((product) => (
						<ProductCard key={product._id} product={product} />
					))}
				</div>
			)}
		</div>
	);
};

export default WishlistPage;
