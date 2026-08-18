/**
 * Pull real catalog data from DummyJSON (names, photos, prices) — no admin clicking.
 *
 *   npm run seed:products:api
 *   npm run seed:products:api -- --clear
 *
 * Uses MONGO_URI from .env (local or Atlas). For the live Render shop,
 * set MONGO_URI to the same Atlas string as Render, then run this once.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Product from "../models/product.model.js";
import { redis } from "../lib/redis.js";
import {
	buildVariantsFromOptions,
	totalVariantStock,
} from "../utils/variant.utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const CATEGORY_FEEDS = [
	{ category: "t-shirts", url: "https://dummyjson.com/products/category/mens-shirts" },
	{ category: "t-shirts", url: "https://dummyjson.com/products/category/tops" },
	{ category: "shoes", url: "https://dummyjson.com/products/category/mens-shoes" },
	{ category: "shoes", url: "https://dummyjson.com/products/category/womens-shoes" },
	{ category: "glasses", url: "https://dummyjson.com/products/category/sunglasses" },
	{ category: "bags", url: "https://dummyjson.com/products/category/womens-bags" },
	{ category: "jackets", url: "https://dummyjson.com/products/search?q=jacket&limit=20" },
	{ category: "jackets", url: "https://dummyjson.com/products/search?q=coat&limit=20" },
	{ category: "jeans", url: "https://dummyjson.com/products/search?q=jeans&limit=20" },
	{ category: "jeans", url: "https://dummyjson.com/products/search?q=trousers&limit=20" },
	{ category: "suits", url: "https://dummyjson.com/products/search?q=suit&limit=15" },
	{ category: "t-shirts", url: "https://fakestoreapi.com/products/category/men's clothing" },
	{ category: "t-shirts", url: "https://fakestoreapi.com/products/category/women's clothing" },
];

const OPTIONS = {
	jeans: {
		sizes: ["S", "M", "L", "XL"],
		colors: ["Blue", "Black", "Grey"],
		styles: ["Slim", "Regular", "Relaxed"],
	},
	"t-shirts": {
		sizes: ["S", "M", "L", "XL"],
		colors: ["White", "Black", "Navy", "Olive"],
		styles: ["Crew Neck", "V-Neck", "Oversized"],
	},
	shoes: {
		sizes: ["6", "7", "8", "9", "10", "11"],
		colors: ["Black", "White", "Brown"],
		styles: ["Casual", "Sport", "Formal"],
	},
	glasses: {
		sizes: ["One Size"],
		colors: ["Black", "Tortoise", "Gold"],
		styles: ["Aviator", "Wayfarer", "Round"],
	},
	jackets: {
		sizes: ["S", "M", "L", "XL"],
		colors: ["Black", "Brown", "Olive"],
		styles: ["Bomber", "Denim", "Leather"],
	},
	suits: {
		sizes: ["S", "M", "L", "XL"],
		colors: ["Navy", "Charcoal", "Black"],
		styles: ["Two-Piece", "Three-Piece"],
	},
	bags: {
		sizes: ["One Size"],
		colors: ["Black", "Tan", "Brown"],
		styles: ["Tote", "Crossbody", "Backpack"],
	},
};

const toInr = (usd) => {
	const n = Number(usd);
	if (!Number.isFinite(n) || n <= 0) return 999;
	return Math.max(199, Math.round(n * 83));
};

const httpsImages = (product) => {
	const raw = [
		...(product.images || []),
		product.thumbnail,
		product.image,
	].filter((url) => typeof url === "string" && url.startsWith("https://"));
	return [...new Set(raw)].slice(0, 4);
};

async function fetchJson(url) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`${url} -> ${res.status}`);
	return res.json();
}

function toDoc(apiProduct, category, index) {
	const images = httpsImages(apiProduct);
	if (!images.length) return null;

	const opts = OPTIONS[category];
	const variants = buildVariantsFromOptions(
		opts.sizes,
		opts.colors,
		4 + (index % 8),
		[]
	);

	return {
		name: String(apiProduct.title || "Product").trim().slice(0, 80),
		description: String(
			apiProduct.description || `${apiProduct.title} from the ${category} collection.`
		).slice(0, 500),
		price: toInr(apiProduct.price),
		category,
		isFeatured: index % 7 === 0,
		images,
		sizes: opts.sizes,
		colors: opts.colors,
		styles: opts.styles,
		variants,
		stock: totalVariantStock(variants),
	};
}

async function seed() {
	if (!process.env.MONGO_URI) {
		console.error("MONGO_URI missing in .env");
		process.exit(1);
	}

	const shouldClear = process.argv.includes("--clear");
	await mongoose.connect(process.env.MONGO_URI);
	console.log("Connected to", process.env.MONGO_URI.replace(/:[^:@]+@/, ":****@"));

	if (shouldClear) {
		const deleted = await Product.deleteMany({});
		console.log(`Cleared ${deleted.deletedCount} products`);
	}

	const seen = new Set();
	const docs = [];

	for (const feed of CATEGORY_FEEDS) {
		try {
			const data = await fetchJson(feed.url);
			const products = Array.isArray(data) ? data : data.products || [];
			products.forEach((item, index) => {
				const key = `${feed.category}:${String(item.title || "").toLowerCase()}`;
				if (seen.has(key)) return;
				const doc = toDoc(item, feed.category, docs.length + index);
				if (!doc) return;
				seen.add(key);
				docs.push(doc);
			});
			console.log(`${feed.category}: +${products.length} from API`);
		} catch (error) {
			console.warn(`Skip ${feed.url}:`, error.message);
		}
	}

	if (!docs.length) {
		console.error("No products fetched. Check internet / DummyJSON.");
		await mongoose.disconnect();
		process.exit(1);
	}

	const inserted = await Product.insertMany(docs);
	console.log(`Inserted ${inserted.length} real catalog products`);

	try {
		const featuredProducts = await Product.find({ isFeatured: true }).lean();
		await redis.set("featured_products", JSON.stringify(featuredProducts));
	} catch (error) {
		console.log("Featured cache skipped:", error.message);
	}

	const counts = await Product.aggregate([
		{ $group: { _id: "$category", count: { $sum: 1 } } },
		{ $sort: { _id: 1 } },
	]);
	console.table(counts.map((c) => ({ category: c._id, count: c.count })));

	await mongoose.disconnect();
	console.log("Done.");
}

seed().catch(async (err) => {
	console.error(err);
	try {
		await mongoose.disconnect();
	} catch {
		/* ignore */
	}
	process.exit(1);
});
