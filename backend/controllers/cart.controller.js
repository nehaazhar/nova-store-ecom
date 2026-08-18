import Product from "../models/product.model.js";
import { getVariantStock } from "../utils/inventory.utils.js";
import { sameVariant as sameVariantOpts } from "../utils/variant.utils.js";

const getProductId = (value) => {
	if (!value) return null;
	if (typeof value === "object" && value._id) return value._id.toString();
	return value.toString();
};

const norm = (value) => String(value || "").trim();

const sameVariant = (item, size, color, style) =>
	sameVariantOpts(item, { size, color, style });

const cleanCartItems = (user) => {
	const before = user.cartItems?.length || 0;
	user.cartItems = (user.cartItems || []).filter((item) => Boolean(getProductId(item.product)));
	return before !== user.cartItems.length;
};

const validateVariantSelection = (product, { size, color, style }) => {
	if (product.sizes?.length && !product.sizes.includes(size)) {
		return { ok: false, message: "Please select a valid size" };
	}
	if (product.colors?.length && !product.colors.includes(color)) {
		return { ok: false, message: "Please select a valid color" };
	}
	if (product.styles?.length && !product.styles.includes(style)) {
		return { ok: false, message: "Please select a valid style" };
	}
	if (product.sizes?.length && !size) {
		return { ok: false, message: "Please select a size" };
	}
	if (product.colors?.length && !color) {
		return { ok: false, message: "Please select a color" };
	}
	if (product.styles?.length && !style) {
		return { ok: false, message: "Please select a style" };
	}

	const available = getVariantStock(product, { size, color, style });
	if (available <= 0) {
		return { ok: false, message: "Selected size/color/style is out of stock" };
	}

	return { ok: true, available };
};

const upsertCartLine = async (user, { productId, quantity = 1, size = "", color = "", style = "" }) => {
	if (!productId) {
		return { ok: false, message: "Product ID is required" };
	}

	const product = await Product.findById(productId);
	if (!product) {
		return { ok: false, message: "Product not found" };
	}

	const selected = {
		size: norm(size),
		color: norm(color),
		style: norm(style),
	};
	const variantCheck = validateVariantSelection(product, selected);
	if (!variantCheck.ok) {
		return variantCheck;
	}

	cleanCartItems(user);

	const existingItem = user.cartItems.find(
		(item) =>
			getProductId(item.product) === productId.toString() &&
			sameVariant(item, selected.size, selected.color, selected.style)
	);

	const qty = Math.max(1, Number(quantity) || 1);
	const nextQty = (existingItem?.quantity || 0) + qty;
	if (nextQty > variantCheck.available) {
		return {
			ok: false,
			message: `Only ${variantCheck.available} item(s) available for this size/color/style`,
		};
	}

	if (existingItem) {
		existingItem.quantity += qty;
	} else {
		user.cartItems.push({
			product: productId,
			quantity: qty,
			size: selected.size,
			color: selected.color,
			style: selected.style,
		});
	}

	return { ok: true };
};

export const getCartProducts = async (req, res) => {
	try {
		const cleaned = cleanCartItems(req.user);
		if (cleaned) {
			await req.user.save();
		}

		const productIds = req.user.cartItems
			.map((item) => getProductId(item.product))
			.filter(Boolean);

		const products = await Product.find({ _id: { $in: productIds } });
		const byId = new Map(products.map((p) => [p._id.toString(), p]));

		const cartItems = [];
		for (const cartItem of req.user.cartItems) {
			const product = byId.get(getProductId(cartItem.product));
			if (!product) continue;
			const selection = {
				size: cartItem.size || "",
				color: cartItem.color || "",
				style: cartItem.style || "",
			};
			cartItems.push({
				...product.toJSON(),
				quantity: cartItem.quantity || 1,
				...selection,
				variantStock: getVariantStock(product, selection),
				cartItemId: cartItem._id.toString(),
			});
		}

		res.json(cartItems);
	} catch (error) {
		console.log("Error in getCartProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const addToCart = async (req, res) => {
	try {
		const { productId, size = "", color = "", style = "" } = req.body;
		const result = await upsertCartLine(req.user, {
			productId,
			quantity: 1,
			size,
			color,
			style,
		});
		if (!result.ok) {
			return res.status(400).json({ message: result.message });
		}

		await req.user.save();
		res.json(req.user.cartItems);
	} catch (error) {
		console.log("Error in addToCart controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const mergeGuestCart = async (req, res) => {
	try {
		const items = Array.isArray(req.body.items) ? req.body.items.slice(0, 50) : [];
		for (const item of items) {
			await upsertCartLine(req.user, {
				productId: item.productId || item._id,
				quantity: item.quantity,
				size: item.size,
				color: item.color,
				style: item.style,
			});
		}
		await req.user.save();
		return getCartProducts(req, res);
	} catch (error) {
		console.log("Error in mergeGuestCart controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const removeAllFromCart = async (req, res) => {
	try {
		const { productId, cartItemId, size = "", color = "", style = "" } = req.body;
		const user = req.user;
		if (!productId && !cartItemId) {
			user.cartItems = [];
		} else if (cartItemId) {
			user.cartItems = (user.cartItems || []).filter(
				(item) => item._id.toString() !== cartItemId.toString()
			);
		} else {
			user.cartItems = (user.cartItems || []).filter(
				(item) =>
					!(
						getProductId(item.product) === productId.toString() &&
						sameVariant(item, size, color, style)
					)
			);
		}
		await user.save();
		res.json(user.cartItems);
	} catch (error) {
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const updateQuantity = async (req, res) => {
	try {
		const { id: productId } = req.params;
		const { quantity, cartItemId, size = "", color = "", style = "" } = req.body;
		const user = req.user;

		cleanCartItems(user);

		const existingItem = cartItemId
			? user.cartItems.id(cartItemId)
			: user.cartItems.find(
					(item) =>
						getProductId(item.product) === productId.toString() &&
						sameVariant(item, size, color, style)
			  );

		if (!existingItem) {
			return res.status(404).json({ message: "Product not found in cart" });
		}

		if (quantity === 0) {
			if (cartItemId) {
				user.cartItems = user.cartItems.filter(
					(item) => item._id.toString() !== cartItemId.toString()
				);
			} else {
				user.cartItems = user.cartItems.filter(
					(item) =>
						!(
							getProductId(item.product) === productId.toString() &&
							sameVariant(item, size, color, style)
						)
				);
			}
			await user.save();
			return res.json(user.cartItems);
		}

		const product = await Product.findById(getProductId(existingItem.product) || productId);
		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}

		const available = getVariantStock(product, {
			size: existingItem.size || size,
			color: existingItem.color || color,
			style: existingItem.style || style,
		});

		if (quantity > available) {
			return res.status(400).json({
				message: `Only ${available} item(s) available for this size/color/style`,
			});
		}

		existingItem.quantity = quantity;
		await user.save();
		res.json(user.cartItems);
	} catch (error) {
		console.log("Error in updateQuantity controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
