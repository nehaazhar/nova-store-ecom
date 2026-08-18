import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import ProductImage from "./ProductImage";

const CategoryItem = ({ category }) => {
	const slug = category.slug || category.name;
	const label = category.label || category.name;
	const count = category.productCount;

	return (
		<Link
			to={`/category/${encodeURIComponent(slug)}`}
			className="group relative block h-80 overflow-hidden rounded-[1.75rem] bg-nova-ink shadow-card sm:h-[22rem]"
		>
			<ProductImage
				src={category.imageUrl || category.image}
				alt={label}
				className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-110"
			/>
			<div className="absolute inset-0 bg-gradient-to-t from-nova-ink via-nova-ink/45 to-transparent transition duration-500 group-hover:via-nova-ink/55" />
			<div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-6">
				<div>
					<h3 className="font-display text-2xl font-bold text-white sm:text-3xl">
						{label}
					</h3>
					<p className="mt-1 text-sm text-white/70">
						{typeof count === "number"
							? `${count} product${count === 1 ? "" : "s"}`
							: `Explore ${label}`}
					</p>
				</div>
				<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md ring-1 ring-white/20 transition group-hover:bg-nova-accent group-hover:ring-nova-accent">
					<ArrowUpRight size={18} />
				</span>
			</div>
		</Link>
	);
};

export default CategoryItem;
