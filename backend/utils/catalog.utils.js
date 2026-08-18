import crypto from "crypto";

export const catalogCacheVersionKey = "catalog:ver";

export const bumpCatalogCache = async (redisClient) => {
	if (!redisClient) return;
	try {
		await redisClient.incr(catalogCacheVersionKey);
	} catch (error) {
		console.error("bumpCatalogCache:", error.message);
	}
};

export const catalogCacheKey = (version, params) => {
	const hash = crypto
		.createHash("sha1")
		.update(JSON.stringify(params))
		.digest("hex")
		.slice(0, 16);
	return `catalog:${version}:${hash}`;
};

export const escapeRegex = (value) =>
	String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const buildCatalogMongoQuery = ({
	search = "",
	category = "",
	minPrice,
	maxPrice,
	sort = "newest",
}) => {
	const filter = {};
	const term = String(search || "").trim();
	const useTextSearch = sort === "relevance" && term.length >= 2;

	if (term) {
		if (useTextSearch) {
			filter.$text = { $search: term };
		} else {
			const rx = { $regex: escapeRegex(term), $options: "i" };
			filter.$or = [{ name: rx }, { description: rx }, { category: rx }];
		}
	}

	if (category.trim() && category.trim().toLowerCase() !== "all") {
		const normalized = category.trim().toLowerCase();
		filter.category = {
			$regex: `^${escapeRegex(normalized)}$`,
			$options: "i",
		};
	}

	const priceFilter = {};
	if (minPrice !== undefined && minPrice !== "" && !Number.isNaN(Number(minPrice))) {
		priceFilter.$gte = Number(minPrice);
	}
	if (maxPrice !== undefined && maxPrice !== "" && !Number.isNaN(Number(maxPrice))) {
		priceFilter.$lte = Number(maxPrice);
	}
	if (Object.keys(priceFilter).length > 0) {
		filter.price = priceFilter;
	}

	let sortOption = { createdAt: -1 };
	let projection;
	switch (sort) {
		case "price-asc":
			sortOption = { price: 1 };
			break;
		case "price-desc":
			sortOption = { price: -1 };
			break;
		case "name-asc":
			sortOption = { name: 1 };
			break;
		case "name-desc":
			sortOption = { name: -1 };
			break;
		case "oldest":
			sortOption = { createdAt: 1 };
			break;
		case "relevance":
			if (useTextSearch) {
				projection = { score: { $meta: "textScore" } };
				sortOption = { score: { $meta: "textScore" } };
			} else {
				sortOption = { createdAt: -1 };
			}
			break;
		case "newest":
		default:
			sortOption = { createdAt: -1 };
			break;
	}

	return { filter, sortOption, projection, useTextSearch };
};
