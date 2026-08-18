import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Truck, RotateCcw } from "lucide-react";
import CategoryItem from "../components/CategoryItem";
import { useProductStore } from "../stores/useProductStore";
import FeaturedProducts from "../components/FeaturedProducts";

const HomePage = () => {
  const {
    fetchFeaturedProducts,
    fetchCategories,
    products,
    categories,
    loading,
  } = useProductStore();

  useEffect(() => {
    fetchFeaturedProducts();
    fetchCategories();
  }, [fetchFeaturedProducts, fetchCategories]);

  return (
    <div>
      {/* Full-bleed cinematic hero */}
      <section className="relative isolate min-h-[88vh] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=2000&q=80"
          alt=""
          className="absolute inset-0 h-full w-full object-cover scale-105 animate-[fadeIn_1.2s_ease-out]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-nova-ink via-nova-ink/80 to-nova-ink/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-nova-ink/70 via-transparent to-nova-ink/30" />
        <div className="nova-grain" />

        <div className="nova-container relative flex min-h-[88vh] flex-col justify-end pb-16 pt-28 sm:pb-20 lg:justify-center lg:pb-24">
          <div className="max-w-2xl animate-fade-up">
            <p className="font-display text-6xl font-extrabold tracking-tight text-white sm:text-7xl lg:text-8xl">
              NOVA
            </p>
            <h1 className="mt-4 max-w-md text-2xl font-semibold leading-snug text-white sm:text-3xl">
              Shop smarter. Checkout faster.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-300 sm:text-lg">
              Live stock, smart variants.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/shop" className="nova-btn">
                Shop the catalog
                <ArrowRight size={16} />
              </Link>
              <a href="#categories" className="nova-btn-ghost">
                Browse categories
              </a>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-nova-bg to-transparent" />
      </section>

      <section className="relative -mt-10 z-10">
        <div className="nova-container">
          <div className="grid gap-3 rounded-3xl border border-nova-line/70 bg-white/90 p-4 shadow-soft backdrop-blur-xl sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-nova-line sm:p-2">
            {[
              {
                icon: Truck,
                title: "Fast dispatch",
                text: "Orders move once stock clears",
              },
              {
                icon: ShieldCheck,
                title: "Secure checkout",
                text: "Stripe + saved addresses",
              },
              {
                icon: RotateCcw,
                title: "Easy returns",
                text: "Request from your orders",
              },
            ].map(({ icon: Icon, title, text }, i) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-2xl p-4 transition hover:bg-nova-glow/40"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-nova-glow to-white text-nova-accent shadow-sm ring-1 ring-nova-accent/10">
                  <Icon size={20} />
                </div>
                <div>
                  <p className="font-semibold text-nova-ink">{title}</p>
                  <p className="mt-0.5 text-sm text-nova-muted">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="categories" className="nova-container py-20">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div className="animate-fade-up">
            <p className="nova-section-label">Shop by category</p>
            <h2 className="mt-2 font-display text-4xl font-bold tracking-tight text-nova-ink sm:text-5xl">
              Find your next pick
            </h2>
          </div>
          <Link
            to="/shop"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-nova-accent"
          >
            View all products
            <ArrowRight
              size={16}
              className="transition group-hover:translate-x-1"
            />
          </Link>
        </div>

        {loading && categories.length === 0 ? (
          <p className="text-nova-muted">Loading categories...</p>
        ) : categories.length === 0 ? (
          <p className="text-nova-muted">
            No categories yet. Add products from the admin dashboard.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, idx) => (
              <div
                key={category.slug || category.name}
                className="animate-fade-up"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <CategoryItem category={category} />
              </div>
            ))}
          </div>
        )}
      </section>

      {!loading && products.length > 0 && (
        <section className="relative overflow-hidden border-y border-nova-line bg-white py-6">
          <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-nova-glow/50 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-teal-100/40 blur-3xl" />
          <FeaturedProducts featuredProducts={products} />
        </section>
      )}

      <section className="nova-container py-20">
        <div className="relative overflow-hidden rounded-[2rem] bg-nova-ink px-8 py-14 text-center shadow-soft sm:px-14">
          <div className="nova-grain opacity-20" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-teal-400/20 blur-3xl" />
          <div className="relative">
            <p className="font-display text-3xl font-bold text-white sm:text-4xl">
              Ready to explore the catalog?
            </p>
            <p className="mx-auto mt-3 max-w-md text-slate-300">
              Search, filter by price, pick variants, and checkout — end to end.
            </p>
            <Link to="/shop" className="nova-btn mt-8">
              Open shop
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
