import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, ChevronLeft, ChevronRight, Loader2, ArrowRight } from "lucide-react";
import { useCartStore } from "../stores/useCartStore";
import ProductImage from "./ProductImage";
import { useThrottledCallback } from "../hooks/useThrottledCallback";

const FeaturedProducts = ({ featuredProducts }) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [itemsPerPage, setItemsPerPage] = useState(4);
	const { addToCart, addingToCart, addingProductId } = useCartStore();

	const updateItemsPerPage = useCallback(() => {
		if (window.innerWidth < 640) setItemsPerPage(1);
		else if (window.innerWidth < 1024) setItemsPerPage(2);
		else if (window.innerWidth < 1280) setItemsPerPage(3);
		else setItemsPerPage(4);
	}, []);

	const onResize = useThrottledCallback(updateItemsPerPage, 200);

	useEffect(() => {
		updateItemsPerPage();
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, [onResize, updateItemsPerPage]);

	const nextSlide = () => {
		setCurrentIndex((prevIndex) => prevIndex + itemsPerPage);
	};

	const prevSlide = () => {
		setCurrentIndex((prevIndex) => prevIndex - itemsPerPage);
	};

	const isStartDisabled = currentIndex === 0;
	const isEndDisabled = currentIndex >= featuredProducts.length - itemsPerPage;

	return (
		<div className="nova-container relative py-16">
			<div className="mb-10 flex items-end justify-between gap-4">
				<div>
					<p className="nova-section-label">Handpicked</p>
					<h2 className="mt-2 font-display text-4xl font-bold tracking-tight text-nova-ink sm:text-5xl">
						Featured products
					</h2>
				</div>
				<Link
					to="/shop"
					className="group inline-flex items-center gap-2 text-sm font-semibold text-nova-accent"
				>
					Shop all
					<ArrowRight size={16} className="transition group-hover:translate-x-1" />
				</Link>
			</div>

			<div className="relative px-1 sm:px-2">
				<div className="overflow-hidden">
					<div
						className="flex transition-transform duration-500 ease-out"
						style={{
							transform: `translateX(-${currentIndex * (100 / itemsPerPage)}%)`,
						}}
					>
						{featuredProducts?.map((product) => {
							const isAdding = addingToCart && addingProductId === product._id;
							const needsOptions =
								(product.sizes?.length || 0) > 0 ||
								(product.colors?.length || 0) > 0 ||
								(product.styles?.length || 0) > 0;
							return (
								<div
									key={product._id}
									className="w-full flex-shrink-0 px-2.5 sm:w-1/2 lg:w-1/3 xl:w-1/4"
								>
									<div className="group overflow-hidden rounded-[1.5rem] border border-nova-line/70 bg-white shadow-card transition duration-500 hover:-translate-y-1 hover:shadow-soft">
										<Link
											to={`/product/${product._id}`}
											className="relative block overflow-hidden"
										>
											<ProductImage
												src={product.images?.[0] || product.image}
												alt={product.name}
												className="h-52 w-full object-cover transition duration-700 group-hover:scale-110"
											/>
											<div className="absolute inset-0 bg-gradient-to-t from-nova-ink/40 to-transparent opacity-0 transition group-hover:opacity-100" />
										</Link>
										<div className="p-4">
											<Link to={`/product/${product._id}`}>
												<h3 className="mb-2 line-clamp-2 text-base font-semibold text-nova-ink hover:text-nova-accent">
													{product.name}
												</h3>
											</Link>
											<p className="mb-4 font-display text-xl font-bold text-nova-ink">
												₹{Number(product.price).toFixed(2)}
											</p>
											<button
												type="button"
												disabled={isAdding}
												onClick={() => {
													if (needsOptions) {
														window.location.href = `/product/${product._id}`;
														return;
													}
													addToCart(product);
												}}
												className="nova-btn w-full !rounded-xl !py-2.5 text-xs"
											>
												{isAdding ? (
													<>
														<Loader2 className="h-4 w-4 animate-spin" />
														Adding...
													</>
												) : (
													<>
														<ShoppingCart className="h-4 w-4" />
														{needsOptions ? "Select options" : "Add to Cart"}
													</>
												)}
											</button>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				<button
					type="button"
					onClick={prevSlide}
					disabled={isStartDisabled}
					className={`absolute top-[40%] -left-1 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border shadow-md transition sm:-left-3 ${
						isStartDisabled
							? "cursor-not-allowed border-nova-line bg-slate-100 text-slate-400"
							: "border-white bg-white text-nova-ink hover:border-nova-accent hover:text-nova-accent"
					}`}
				>
					<ChevronLeft className="h-5 w-5" />
				</button>

				<button
					type="button"
					onClick={nextSlide}
					disabled={isEndDisabled}
					className={`absolute top-[40%] -right-1 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border shadow-md transition sm:-right-3 ${
						isEndDisabled
							? "cursor-not-allowed border-nova-line bg-slate-100 text-slate-400"
							: "border-white bg-white text-nova-ink hover:border-nova-accent hover:text-nova-accent"
					}`}
				>
					<ChevronRight className="h-5 w-5" />
				</button>
			</div>
		</div>
	);
};

export default FeaturedProducts;
