import { Minus, Plus, Trash } from "lucide-react";
import { Link } from "react-router-dom";
import { useCartStore } from "../stores/useCartStore";

const CartItem = ({ item }) => {
	const { removeFromCart, updateQuantity, cartUpdating } = useCartStore();
	const variants = [
		item.size && `Size: ${item.size}`,
		item.color && `Color: ${item.color}`,
		item.style && `Style: ${item.style}`,
	].filter(Boolean);

	return (
		<div className="nova-card p-4 md:p-5">
			<div className="space-y-4 md:flex md:items-center md:justify-between md:gap-6 md:space-y-0">
				<div className="shrink-0 md:order-1">
					<img
						className="h-24 w-24 rounded-xl object-cover md:h-28 md:w-28"
						src={item.images?.[0] || item.image}
						alt={item.name}
					/>
				</div>

				<div className="flex items-center justify-between md:order-3 md:justify-end">
					<div className="flex items-center gap-2">
						<button
							disabled={cartUpdating}
							className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-nova-line bg-white hover:border-nova-accent disabled:opacity-50"
							onClick={() => updateQuantity(item, item.quantity - 1)}
						>
							<Minus size={14} className="text-nova-ink" />
						</button>
						<p className="min-w-[1.5rem] text-center font-medium">{item.quantity}</p>
						<button
							disabled={cartUpdating}
							className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-nova-line bg-white hover:border-nova-accent disabled:opacity-50"
							onClick={() => updateQuantity(item, item.quantity + 1)}
						>
							<Plus size={14} className="text-nova-ink" />
						</button>
					</div>

					<div className="text-end md:order-4 md:w-28">
						<p className="font-display text-lg font-bold text-nova-ink">₹{item.price}</p>
					</div>
				</div>

				<div className="w-full min-w-0 flex-1 space-y-1 md:order-2 md:max-w-md">
					<Link
						to={`/product/${item._id}`}
						className="text-base font-semibold text-nova-ink hover:text-nova-accent"
					>
						{item.name}
					</Link>
					{variants.length > 0 && (
						<p className="text-sm text-nova-accent">{variants.join(" · ")}</p>
					)}
					<p className="line-clamp-2 text-sm text-nova-muted">{item.description}</p>

					<button
						type="button"
						className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-red-500 hover:text-red-600"
						onClick={() => removeFromCart(item)}
					>
						<Trash size={14} />
						Remove
					</button>
				</div>
			</div>
		</div>
	);
};

export default CartItem;
