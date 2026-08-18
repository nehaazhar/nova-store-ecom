import mongoose from "mongoose";
import {
	buildVariantsFromOptions,
	totalVariantStock,
} from "../utils/variant.utils.js";

export const connectDB = async () => {
	try {
		const conn = await mongoose.connect(process.env.MONGO_URI);
		console.log(`MongoDB connected: ${conn.connection.host}`);

		try {
			const indexes = await conn.connection.collection("coupons").indexes();
			const userIdUnique = indexes.find(
				(idx) => idx.key?.userId === 1 && idx.unique === true
			);
			if (userIdUnique) {
				await conn.connection.collection("coupons").dropIndex(userIdUnique.name);
				console.log(`Dropped legacy unique index on coupons.userId (${userIdUnique.name})`);
			}
		} catch (indexError) {
			if (indexError.code !== 26 && indexError.codeName !== "NamespaceNotFound") {
				console.log("Coupon index cleanup skipped:", indexError.message);
			}
		}

		try {
			const result = await conn.connection.collection("products").updateMany(
				{ $or: [{ stock: { $exists: false } }, { stock: null }] },
				{ $set: { stock: 50 } }
			);
			if (result.modifiedCount > 0) {
				console.log(`Backfilled stock on ${result.modifiedCount} product(s)`);
			}
		} catch (stockError) {
			console.log("Stock backfill skipped:", stockError.message);
		}

		// Rebuild size×color inventory (drop old size×color×style combos)
		try {
			const products = await conn.connection.collection("products").find({}).toArray();
			let updated = 0;

			for (const p of products) {
				const category = p.category || "";
				const sizes =
					p.sizes?.length > 0
						? p.sizes
						: category === "shoes"
							? ["6", "7", "8", "9", "10", "11"]
							: category === "glasses" || category === "bags"
								? ["One Size"]
								: ["S", "M", "L", "XL"];
				const colors =
					p.colors?.length > 0 ? p.colors : ["Black", "White", "Blue"];
				const styles =
					p.styles?.length > 0 ? p.styles : ["Regular", "Casual", "Classic"];

				const hasStyleInVariants = (p.variants || []).some((v) => v.style);
				const needsRebuild =
					!Array.isArray(p.variants) ||
					p.variants.length === 0 ||
					hasStyleInVariants ||
					p.variants.length !== sizes.length * colors.length;

				if (!needsRebuild) continue;

				const defaultStock = Math.max(
					1,
					Math.floor(
						Number(p.stock || 24) / Math.max(1, sizes.length * colors.length)
					)
				);
				const variants = buildVariantsFromOptions(
					sizes,
					colors,
					defaultStock,
					// migrate: keep stock from old rows by size+color (sum if multiple styles)
					(p.variants || []).reduce((acc, v) => {
						const key = `${v.size || ""}|${v.color || ""}`;
						const found = acc.find(
							(x) => `${x.size}|${x.color}` === key
						);
						if (found) found.stock += Number(v.stock) || 0;
						else
							acc.push({
								size: v.size || "",
								color: v.color || "",
								stock: Number(v.stock) || 0,
							});
						return acc;
					}, [])
				);

				await conn.connection.collection("products").updateOne(
					{ _id: p._id },
					{
						$set: {
							sizes,
							colors,
							styles,
							variants,
							stock: totalVariantStock(variants),
						},
					}
				);
				updated += 1;
			}

			if (updated > 0) {
				console.log(`Rebuilt size×color inventory on ${updated} product(s)`);
			}
		} catch (variantError) {
			console.log("Variant inventory backfill skipped:", variantError.message);
		}
	} catch (error) {
		console.log("Error connecting to MONGODB", error.message);
		process.exit(1);
	}
};
