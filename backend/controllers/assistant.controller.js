import Product from "../models/product.model.js";

const POLICIES = [
	{
		title: "Shipping",
		text: "NOVA ships orders in 3 to 7 days depending on location and product availability.",
		keywords: ["shipping", "delivery", "deliver", "arrive", "days"],
	},
	{
		title: "Returns",
		text: "Unused items can be returned easily. Products should be in original condition for return handling.",
		keywords: ["return", "refund", "exchange", "unused"],
	},
	{
		title: "Payments",
		text: "NOVA supports Cash on Delivery and Razorpay payments such as card or UPI when Razorpay is configured.",
		keywords: ["payment", "pay", "cod", "cash", "razorpay", "upi", "card"],
	},
];

const CATEGORY_ALIASES = {
	shoes: ["shoe", "shoes", "sneaker", "sneakers", "slipper", "slippers", "boot", "boots", "footwear"],
	shirts: ["shirt", "shirts", "formal", "office"],
	tops: ["top", "tops", "tshirt", "tshirts", "t-shirt", "tee"],
	dresses: ["dress", "dresses", "frock", "gown"],
	bags: ["bag", "bags", "handbag", "purse"],
	sunglasses: ["sunglass", "sunglasses", "glasses", "eyewear"],
	watches: ["watch", "watches"],
	jewellery: ["jewellery", "jewelry", "necklace", "ring", "bracelet", "earrings"],
};

const normalize = (value) => String(value || "").toLowerCase();

const tokenize = (value) =>
	normalize(value)
		.replace(/[^a-z0-9\s]/g, " ")
		.split(/\s+/)
		.filter((word) => word.length > 1);

const detectCategory = (queryTokens) => {
	for (const [category, aliases] of Object.entries(CATEGORY_ALIASES)) {
		if (aliases.some((alias) => queryTokens.includes(alias))) return category;
	}
	return null;
};

const parseBudget = (query) => {
	const normalized = normalize(query);
	const match =
		normalized.match(/(?:under|below|less than|upto|up to|budget|within|<=?)\s*(?:rs\.?|inr)?\s*(\d+)/i) ||
		normalized.match(/(?:rs\.?|inr)\s*(\d+)/i);
	return match ? Number(match[1]) : null;
};

const buildProductText = (product) =>
	[
		product.name,
		product.description,
		product.category,
		...(product.sizes || []),
		...(product.colors || []),
		...(product.styles || []),
	].join(" ");

const scoreProduct = (product, queryTokens, budget, categoryIntent) => {
	const haystack = normalize(buildProductText(product));
	const category = normalize(product.category);
	if (categoryIntent && category !== categoryIntent) return -Infinity;

	let score = 0;
	for (const token of queryTokens) {
		if (haystack.includes(token)) score += token.length > 3 ? 3 : 1;
	}
	if (categoryIntent && category === categoryIntent) score += 10;
	if (budget && product.price <= budget) score += 4;
	if (budget && product.price > budget) score -= 5;
	if ((product.stock ?? 0) > 0) score += 2;
	if ((product.averageRating || 0) >= 4) score += 1;
	return score;
};

const scorePolicy = (policy, queryTokens) =>
	policy.keywords.reduce(
		(score, keyword) => score + (queryTokens.includes(keyword) ? 4 : 0),
		0
	);

const formatProductLine = (product) => {
	const stockLabel = (product.stock ?? 0) > 0 ? `${product.stock} left` : "sold out";
	return `${product.name} (Rs ${product.price}, ${product.category}, ${stockLabel})`;
};

const buildAnswer = ({ products, policies, budget }) => {
	if (!products.length && !policies.length) {
		return "I could not find a strong match in the current catalog. Try asking with category, color, use case, or budget, like 'black shoes under 2000'.";
	}

	const parts = [];
	if (products.length) {
		const budgetText = budget ? ` within Rs ${budget}` : "";
		parts.push(
			`Based on the NOVA catalog, these look relevant${budgetText}: ${products
				.map(formatProductLine)
				.join("; ")}.`
		);
	}
	if (policies.length) {
		parts.push(policies.map((policy) => `${policy.title}: ${policy.text}`).join(" "));
	}
	if (products.length) {
		parts.push("Open a product to confirm size/color/style availability before adding it to cart.");
	}
	return parts.join(" ");
};

export const askShoppingAssistant = async (req, res) => {
	try {
		const question = String(req.body?.question || "").trim();
		if (question.length < 2) {
			return res.status(400).json({ message: "Please ask a product or shopping question" });
		}

		const queryTokens = tokenize(question);
		const budget = parseBudget(question);
		const categoryIntent = detectCategory(queryTokens);
		const textQuery = queryTokens.join(" ");
		const mongoFilter = {
			...(budget ? { price: { $lte: Math.max(budget, 1) } } : {}),
			...(categoryIntent ? { category: categoryIntent } : {}),
		};

		const textMatches = textQuery
			? await Product.find(
					{ ...mongoFilter, $text: { $search: textQuery } },
					{ score: { $meta: "textScore" } }
			  )
					.sort({ score: { $meta: "textScore" }, averageRating: -1 })
					.limit(16)
					.lean()
					.catch(() => [])
			: [];

		const fallbackProducts = await Product.find(mongoFilter)
			.sort({ isFeatured: -1, averageRating: -1, stock: -1, createdAt: -1 })
			.limit(40)
			.lean();

		const productsById = new Map(
			[...textMatches, ...fallbackProducts].map((product) => [
				product._id.toString(),
				product,
			])
		);
		const rankedProducts = [...productsById.values()]
			.map((product) => ({
				product,
				score: scoreProduct(product, queryTokens, budget, categoryIntent),
			}))
			.filter(({ score }) => score > 0)
			.sort(
				(a, b) =>
					b.score - a.score ||
					(b.product.averageRating || 0) - (a.product.averageRating || 0)
			)
			.slice(0, 4)
			.map(({ product }) => ({
				_id: product._id,
				name: product.name,
				price: product.price,
				category: product.category,
				image: product.images?.[0] || product.image || "",
				stock: product.stock,
				averageRating: product.averageRating || 0,
				sizes: product.sizes || [],
				colors: product.colors || [],
				styles: product.styles || [],
			}));

		const matchedPolicies = POLICIES.map((policy) => ({
			policy,
			score: scorePolicy(policy, queryTokens),
		}))
			.filter(({ score }) => score > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, 2)
			.map(({ policy }) => policy);

		res.json({
			answer: buildAnswer({ products: rankedProducts, policies: matchedPolicies, budget }),
			products: rankedProducts,
			sources: [
				...(rankedProducts.length ? ["Product catalog"] : []),
				...matchedPolicies.map((policy) => `${policy.title} policy`),
			],
		});
	} catch (error) {
		console.error("Shopping assistant error:", error);
		res.status(500).json({
			message: "Assistant could not answer right now",
			error: error.message,
		});
	}
};

