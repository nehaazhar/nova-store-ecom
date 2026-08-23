/**
 * Load real DummyJSON catalog photos, names, and prices, plus size/color stock.
 *
 *   npm run seed:products:api
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Product from "../models/product.model.js";
import { redis } from "../lib/redis.js";
import { fetchRealCatalogDocs } from "../data/realCatalog.js";
import { bumpCatalogCache } from "../utils/catalog.utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function seed() {
	if (!process.env.MONGO_URI) {
		console.error("MONGO_URI missing in .env");
		process.exit(1);
	}

	await mongoose.connect(process.env.MONGO_URI);
	console.log("Connected to MongoDB");

	const docs = await fetchRealCatalogDocs();
	if (!docs.length) {
		console.error("No products fetched. Check internet / DummyJSON.");
		await mongoose.disconnect();
		process.exit(1);
	}

	const deleted = await Product.deleteMany({});
	console.log(`Cleared ${deleted.deletedCount} existing products`);

	const inserted = await Product.insertMany(docs);
	console.log(`Inserted ${inserted.length} real catalog products`);

	try {
		const featuredProducts = await Product.find({ isFeatured: true }).lean();
		await redis.set("featured_products", JSON.stringify(featuredProducts));
		await bumpCatalogCache(redis);
	} catch (error) {
		console.log("Cache update skipped:", error.message);
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
