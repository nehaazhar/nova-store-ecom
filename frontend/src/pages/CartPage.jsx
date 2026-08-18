import { Link } from "react-router-dom";
import { useCartStore } from "../stores/useCartStore";
import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import CartItem from "../components/CartItem";
import PeopleAlsoBought from "../components/PeopleAlsoBought";
import OrderSummary from "../components/OrderSummary";
import GiftCouponCard from "../components/GiftCouponCard";
import { CheckoutAddressCard } from "./AddressesPage";
import { useUserStore } from "../stores/useUserStore";

const CartPage = () => {
  const { cart } = useCartStore();
  const { user } = useUserStore();

  return (
    <div className="nova-container py-10 sm:py-14">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wider text-nova-accent">
          Checkout
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-nova-ink">
          Your cart
        </h1>
      </div>

      <div className="gap-8 lg:flex lg:items-start">
        <motion.div
          className="w-full flex-none lg:max-w-2xl xl:max-w-4xl"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          {cart.length === 0 ? (
            <EmptyCartUI />
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <CartItem
                  key={
                    item.cartItemId ||
                    `${item._id}-${item.size}-${item.color}-${item.style}`
                  }
                  item={item}
                />
              ))}
            </div>
          )}
          {cart.length > 0 && <PeopleAlsoBought />}
        </motion.div>

        {cart.length > 0 && (
          <motion.div
            className="mt-8 w-full flex-1 space-y-5 lg:mt-0"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {user ? (
              <>
                <CheckoutAddressCard />
                <OrderSummary />
                <GiftCouponCard />
              </>
            ) : (
              <div className="nova-card space-y-3 p-5">
                <p className="font-medium text-nova-ink">Login to checkout</p>
                <p className="text-sm text-nova-muted">
                  Sign in to add an address and pay.
                </p>
                <Link to="/login" className="nova-btn">
                  Login to continue
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CartPage;

const EmptyCartUI = () => (
  <motion.div
    className="nova-card flex flex-col items-center justify-center space-y-4 px-6 py-16 text-center"
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-nova-glow text-nova-accent">
      <ShoppingCart className="h-10 w-10" />
    </div>
    <h3 className="font-display text-2xl font-bold text-nova-ink">
      Your cart is empty
    </h3>
    <p className="max-w-sm text-nova-muted">
      Looks like you haven&apos;t added anything to your cart yet.
    </p>
    <Link to="/shop" className="nova-btn mt-2">
      Start shopping
    </Link>
  </motion.div>
);
