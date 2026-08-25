import { useEffect, useState } from "react";
import {
	ShoppingCart,
	UserPlus,
	LogIn,
	LogOut,
	Lock,
	Package,
	Search,
	Heart,
	MapPin,
	Menu,
	X,
	User,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useUserStore } from "../stores/useUserStore";
import { useCartStore } from "../stores/useCartStore";
import { useWishlistStore } from "../stores/useWishlistStore";
import axios from "../lib/axios";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

const Navbar = () => {
	const { user, logout } = useUserStore();
	const isAdmin = user?.role === "admin";
	const { cart } = useCartStore();
	const { wishlist } = useWishlistStore();
	const navigate = useNavigate();
	const [searchTerm, setSearchTerm] = useState("");
	const [open, setOpen] = useState(false);
	const [suggestions, setSuggestions] = useState([]);
	const debouncedTerm = useDebouncedValue(searchTerm, 250);

	useEffect(() => {
		const q = debouncedTerm.trim();
		if (q.length < 2) {
			setSuggestions([]);
			return;
		}
		let cancelled = false;
		axios
			.get("/products/search-suggest", { params: { q } })
			.then((res) => {
				if (!cancelled) setSuggestions(res.data.suggestions || []);
			})
			.catch(() => {
				if (!cancelled) setSuggestions([]);
			});
		return () => {
			cancelled = true;
		};
	}, [debouncedTerm]);

	const handleSearch = (e) => {
		e.preventDefault();
		const q = searchTerm.trim();
		navigate(q ? `/shop?search=${encodeURIComponent(q)}` : "/shop");
		setSuggestions([]);
		setOpen(false);
	};

	const iconLink =
		"relative inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-teal-50 hover:text-nova-accent";

	return (
		<header className="fixed inset-x-0 top-0 z-50 border-b border-white/40 bg-white/75 shadow-nav backdrop-blur-2xl">
			<div className="nova-container">
				<div className="flex h-[4.25rem] items-center gap-3 sm:h-[4.75rem] sm:gap-5">
					<Link to="/" className="group flex shrink-0 items-center gap-2.5">
						<span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-shine font-display text-sm font-extrabold text-white shadow-lift transition group-hover:scale-105">
							N
						</span>
						<span className="font-display text-2xl font-extrabold tracking-tight text-nova-ink">
							NOVA
						</span>
					</Link>

					<form onSubmit={handleSearch} className="hidden flex-1 md:block">
						<div className="relative mx-auto max-w-xl">
							<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-nova-muted" />
							<input
								type="search"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								placeholder="Search products, brands, categories..."
								className="w-full rounded-full border border-nova-line/80 bg-nova-bg/80 py-2.5 pl-11 pr-4 text-sm text-nova-ink outline-none transition placeholder:text-nova-muted focus:border-nova-accent focus:bg-white focus:ring-4 focus:ring-nova-accent/15"
								autoComplete="off"
							/>
							{suggestions.length > 0 && (
								<ul className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-nova-line bg-white shadow-card">
									{suggestions.map((item) => (
										<li key={item._id}>
											<Link
												to={`/product/${item._id}`}
												onClick={() => {
													setSuggestions([]);
													setSearchTerm("");
												}}
												className="flex items-center gap-3 px-4 py-2.5 text-sm text-nova-ink hover:bg-nova-glow"
											>
												{item.image ? (
													<img
														src={item.image}
														alt=""
														className="h-9 w-9 rounded-lg object-cover"
													/>
												) : null}
												<span className="flex-1 truncate">{item.name}</span>
												<span className="text-xs capitalize text-nova-muted">{item.category}</span>
											</Link>
										</li>
									))}
								</ul>
							)}
						</div>
					</form>

					<nav className="ml-auto hidden items-center gap-0.5 lg:flex">
						<Link to="/shop" className={iconLink}>
							Shop
						</Link>
						<Link to="/cart" className={iconLink}>
							<ShoppingCart size={17} />
							<span className="hidden xl:inline">Cart</span>
							{cart.length > 0 && (
								<span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-shine px-1 text-[10px] font-bold text-white shadow-sm">
									{cart.length}
								</span>
							)}
						</Link>
						{user && (
							<>
								<Link to="/orders" className={iconLink}>
									<Package size={17} />
									<span className="hidden xl:inline">My Orders</span>
								</Link>
								<Link to="/addresses" className={iconLink}>
									<MapPin size={17} />
								</Link>
								<Link to="/wishlist" className={iconLink}>
									<Heart size={17} />
									{wishlist.length > 0 && (
										<span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-shine px-1 text-[10px] font-bold text-white shadow-sm">
											{wishlist.length}
										</span>
									)}
								</Link>
								<Link to="/account" className={iconLink}>
									<User size={17} />
								</Link>
							</>
						)}
						{isAdmin && (
							<Link to="/admin" className="nova-btn ml-2 !rounded-xl !px-4 !py-2 text-xs">
								<Lock size={14} />
								Admin
							</Link>
						)}
						{user ? (
							<button
								type="button"
								onClick={logout}
								className="nova-btn-outline ml-2 !rounded-xl !px-4 !py-2 text-xs"
							>
								<LogOut size={14} />
								Logout
							</button>
						) : (
							<>
								<Link
									to="/login"
									className="nova-btn-outline ml-2 !rounded-xl !px-4 !py-2 text-xs"
								>
									<LogIn size={14} />
									Login
								</Link>
								<Link to="/signup" className="nova-btn !rounded-xl !px-4 !py-2 text-xs">
									<UserPlus size={14} />
									Sign up
								</Link>
							</>
						)}
					</nav>

					<div className="ml-auto flex items-center gap-2 lg:hidden">
						<Link to="/cart" className={iconLink}>
								<ShoppingCart size={20} />
								{cart.length > 0 && (
									<span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-shine px-1 text-[10px] font-bold text-white">
										{cart.length}
									</span>
								)}
							</Link>
						<button
							type="button"
							className="rounded-xl border border-nova-line bg-white p-2 text-nova-ink shadow-sm"
							onClick={() => setOpen((v) => !v)}
							aria-label="Toggle menu"
						>
							{open ? <X size={20} /> : <Menu size={20} />}
						</button>
					</div>
				</div>

				<form onSubmit={handleSearch} className="pb-3 md:hidden">
					<div className="relative">
						<Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-nova-muted" />
						<input
							type="search"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder="Search NOVA..."
							className="w-full rounded-full border border-nova-line bg-nova-bg pl-10 pr-4 py-2.5 text-sm outline-none focus:border-nova-accent focus:bg-white focus:ring-4 focus:ring-nova-accent/15"
						/>
					</div>
				</form>
			</div>

			{open && (
				<div className="border-t border-nova-line/70 bg-white/95 backdrop-blur-xl lg:hidden">
					<div className="nova-container flex flex-col gap-1 py-3">
						{[
							{ to: "/shop", label: "Shop all" },
							{ to: "/cart", label: "Cart" },
							...(user
								? [
										{ to: "/orders", label: "My Orders" },
										{ to: "/wishlist", label: "Wishlist" },
										{ to: "/addresses", label: "Addresses" },
										{ to: "/account", label: "Account" },
									]
								: []),
							...(isAdmin
								? [{ to: "/admin", label: "Admin dashboard" }]
								: []),
						].map((item) => (
							<Link
								key={item.to}
								to={item.to}
								className={iconLink}
								onClick={() => setOpen(false)}
							>
								{item.label}
							</Link>
						))}
						{user ? (
							<button type="button" className={`${iconLink} text-left`} onClick={logout}>
								Log out
							</button>
						) : (
							<>
								<Link to="/login" className={iconLink} onClick={() => setOpen(false)}>
									Login
								</Link>
								<Link to="/signup" className={iconLink} onClick={() => setOpen(false)}>
									Sign up
								</Link>
							</>
						)}
					</div>
				</div>
			)}
		</header>
	);
};

export default Navbar;

