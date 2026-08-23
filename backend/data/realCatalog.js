import {
	buildVariantsFromOptions,
	totalVariantStock,
} from "../utils/variant.utils.js";

const FEEDS = [
	{ category: "shirts", url: "https://dummyjson.com/products/category/mens-shirts" },
	{ category: "tops", url: "https://dummyjson.com/products/category/tops" },
	{ category: "dresses", url: "https://dummyjson.com/products/category/womens-dresses" },
	{ category: "shoes", url: "https://dummyjson.com/products/category/mens-shoes" },
	{ category: "shoes", url: "https://dummyjson.com/products/category/womens-shoes" },
	{ category: "bags", url: "https://dummyjson.com/products/category/womens-bags" },
	{ category: "sunglasses", url: "https://dummyjson.com/products/category/sunglasses" },
	{ category: "watches", url: "https://dummyjson.com/products/category/mens-watches" },
	{ category: "watches", url: "https://dummyjson.com/products/category/womens-watches" },
	{ category: "jewellery", url: "https://dummyjson.com/products/category/womens-jewellery" },
];

const OPTIONS = {
	shirts: {
		sizes: ["S", "M", "L", "XL"],
		colors: ["White", "Blue", "Black", "Navy"],
		styles: ["Casual", "Check", "Short Sleeve"],
	},
	tops: {
		sizes: ["S", "M", "L", "XL"],
		colors: ["White", "Black", "Pink", "Olive"],
		styles: ["Regular", "Cropped", "Oversized"],
	},
	dresses: {
		sizes: ["S", "M", "L", "XL"],
		colors: ["Black", "Red", "Beige", "Navy"],
		styles: ["Midi", "Mini", "Evening"],
	},
	shoes: {
		sizes: ["6", "7", "8", "9", "10", "11"],
		colors: ["Black", "White", "Brown"],
		styles: ["Casual", "Sport", "Formal"],
	},
	bags: {
		sizes: ["One Size"],
		colors: ["Black", "Tan", "Brown"],
		styles: ["Tote", "Shoulder", "Mini"],
	},
	sunglasses: {
		sizes: ["One Size"],
		colors: ["Black", "Tortoise", "Gold"],
		styles: ["Aviator", "Wayfarer", "Round"],
	},
	watches: {
		sizes: ["One Size"],
		colors: ["Black", "Silver", "Gold"],
		styles: ["Casual", "Sport", "Dress"],
	},
	jewellery: {
		sizes: ["One Size"],
		colors: ["Gold", "Silver", "Rose Gold"],
		styles: ["Necklace", "Ring", "Earrings"],
	},
};

const PER_CATEGORY_CAP = 8;

const toInr = (usd) => {
	const n = Number(usd);
	if (!Number.isFinite(n) || n <= 0) return 999;
	return Math.max(199, Math.round(n * 83));
};

const httpsImages = (product) => {
	const raw = [...(product.images || []), product.thumbnail, product.image].filter(
		(url) => typeof url === "string" && url.startsWith("https://")
	);
	return [...new Set(raw)].slice(0, 4);
};

async function fetchJson(url) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`${url} -> ${res.status}`);
	return res.json();
}

function toDoc(apiProduct, category, indexInCategory) {
	const images = httpsImages(apiProduct);
	if (!images.length) return null;

	const opts = OPTIONS[category];
	if (!opts) return null;

	const variants = buildVariantsFromOptions(
		opts.sizes,
		opts.colors,
		5 + (indexInCategory % 8),
		[]
	);

	const reviews = Array.isArray(apiProduct.reviews) ? apiProduct.reviews : [];

	return {
		name: String(apiProduct.title || "Product").trim().slice(0, 80),
		description: String(
			apiProduct.description || `${apiProduct.title} from the ${category} collection.`
		).slice(0, 500),
		price: toInr(apiProduct.price),
		category,
		isFeatured: indexInCategory < 2,
		images,
		sizes: opts.sizes,
		colors: opts.colors,
		styles: opts.styles,
		variants,
		stock: totalVariantStock(variants),
		averageRating: Math.min(5, Math.max(0, Number(apiProduct.rating) || 0)),
		numReviews: reviews.length || Math.max(1, Math.round((Number(apiProduct.rating) || 4) * 3)),
	};
}

export async function fetchRealCatalogDocs() {
	const byCategory = new Map();

	for (const feed of FEEDS) {
		try {
			const data = await fetchJson(feed.url);
			const products = Array.isArray(data) ? data : data.products || [];
			if (!byCategory.has(feed.category)) byCategory.set(feed.category, []);
			const bucket = byCategory.get(feed.category);
			const seen = new Set(bucket.map((d) => d.name.toLowerCase()));

			for (const item of products) {
				if (bucket.length >= PER_CATEGORY_CAP) break;
				const name = String(item.title || "").trim();
				if (!name || seen.has(name.toLowerCase())) continue;
				const doc = toDoc(item, feed.category, bucket.length);
				if (!doc) continue;
				seen.add(name.toLowerCase());
				bucket.push(doc);
			}
		} catch (error) {
			console.warn(`Skip ${feed.url}:`, error.message);
		}
	}

	return [...byCategory.values()].flat();
}
