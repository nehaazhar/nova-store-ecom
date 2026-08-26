import { Navigate, Route, Routes, Link } from "react-router-dom";

import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import CategoryPage from "./pages/CategoryPage";

import Navbar from "./components/Navbar";
import { Toaster } from "react-hot-toast";
import { useUserStore } from "./stores/useUserStore";
import { useEffect } from "react";
import LoadingSpinner from "./components/LoadingSpinner";
import CartPage from "./pages/CartPage";
import { useCartStore } from "./stores/useCartStore";
import PurchaseSuccessPage from "./pages/PurchaseSuccessPage";
import PurchaseCancelPage from "./pages/PurchaseCancelPage";
import OrdersPage from "./pages/OrdersPage";
import ShopPage from "./pages/ShopPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import WishlistPage from "./pages/WishlistPage";
import AddressesPage from "./pages/AddressesPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import AccountPage from "./pages/AccountPage";
import AssistantWidget from "./components/AssistantWidget";
import { useWishlistStore } from "./stores/useWishlistStore";

function App() {
	const { user, checkAuth, checkingAuth } = useUserStore();
	const { getCartItems } = useCartStore();
	const { fetchWishlist } = useWishlistStore();

	useEffect(() => {
		checkAuth();
	}, [checkAuth]);

	useEffect(() => {
		if (!user) {
			useWishlistStore.setState({ wishlist: [] });
			getCartItems();
		} else {
			fetchWishlist();
			useCartStore.getState().mergeGuestCart();
		}
	}, [getCartItems, fetchWishlist, user]);

	if (checkingAuth) return <LoadingSpinner />;

	return (
		<div className="min-h-screen bg-nova-bg text-nova-ink">
			<Navbar />
			<main className="pt-[4.5rem] sm:pt-20">
				<Routes>
					<Route path="/" element={<HomePage />} />
					<Route path="/shop" element={<ShopPage />} />
					<Route path="/product/:id" element={<ProductDetailPage />} />
					<Route
						path="/signup"
						element={!user ? <SignUpPage /> : <Navigate to="/" />}
					/>
					<Route
						path="/login"
						element={!user ? <LoginPage /> : <Navigate to="/" />}
					/>
					<Route
						path="/forgot-password"
						element={!user ? <ForgotPasswordPage /> : <Navigate to="/" />}
					/>
					<Route
						path="/reset-password"
						element={!user ? <ResetPasswordPage /> : <Navigate to="/" />}
					/>
					<Route path="/verify-email" element={<VerifyEmailPage />} />
					<Route
						path="/account"
						element={user ? <AccountPage /> : <Navigate to="/login" />}
					/>
					<Route
						path="/admin"
						element={
							user?.role === "admin" ? <AdminPage /> : <Navigate to="/login" />
						}
					/>
					<Route path="/secret-dashboard" element={<Navigate to="/admin" replace />} />
					<Route path="/category/:category" element={<CategoryPage />} />
					<Route path="/cart" element={<CartPage />} />
					<Route
						path="/orders"
						element={user ? <OrdersPage /> : <Navigate to="/login" />}
					/>
					<Route
						path="/wishlist"
						element={user ? <WishlistPage /> : <Navigate to="/login" />}
					/>
					<Route
						path="/addresses"
						element={user ? <AddressesPage /> : <Navigate to="/login" />}
					/>
					<Route
						path="/purchase-success"
						element={user ? <PurchaseSuccessPage /> : <Navigate to="/login" />}
					/>
					<Route
						path="/purchase-cancel"
						element={user ? <PurchaseCancelPage /> : <Navigate to="/login" />}
					/>
				</Routes>
			</main>

			<footer className="relative mt-20 overflow-hidden border-t border-nova-line bg-nova-ink text-white">
				<div className="pointer-events-none absolute -right-20 top-0 h-56 w-56 rounded-full bg-teal-400/15 blur-3xl" />
				<div className="nova-container relative grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-3">
					<div>
						<div className="flex items-center gap-2.5">
							<span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-shine font-display text-sm font-extrabold">
								N
							</span>
							<span className="font-display text-2xl font-extrabold tracking-tight">
								NOVA
							</span>
						</div>
						<p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
							Clothes, shoes, and extras. Filter the catalog, save a wishlist, checkout
							when you are ready.
						</p>
					</div>
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
							Explore
						</p>
						<div className="mt-4 flex flex-col gap-2 text-sm text-slate-300">
							<Link to="/shop" className="hover:text-white">
								Shop
							</Link>
							<Link to="/orders" className="hover:text-white">
								Track orders
							</Link>
							<Link to="/wishlist" className="hover:text-white">
								Wishlist
							</Link>
						</div>
					</div>
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
							Help
						</p>
						<div className="mt-4 flex flex-col gap-2 text-sm text-slate-300">
							<p>Shipping in 3–7 days</p>
							<p>Easy returns on unused items</p>
							<p>Card, UPI, or cash on delivery</p>
						</div>
					</div>
				</div>
				<div className="border-t border-white/10">
					<div className="nova-container flex flex-col gap-2 py-5 text-xs text-slate-500 sm:flex-row sm:justify-between">
						<span>© {new Date().getFullYear()} NOVA</span>
					</div>
				</div>
			</footer>

			<AssistantWidget />

			<Toaster
				position="top-right"
				toastOptions={{
					style: {
						background: "#08111f",
						color: "#fff",
						borderRadius: "14px",
						fontSize: "14px",
						boxShadow: "0 12px 40px -16px rgba(0,0,0,0.45)",
					},
				}}
			/>
		</div>
	);
}

export default App;
