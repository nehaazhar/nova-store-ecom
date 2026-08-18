import Product from "../models/product.model.js";
import {
	findVariant,
	getVariantStock,
	sameVariant,
	norm,
	totalVariantStock,
} from "./variant.utils.js";

const getProductId = (item) =>
	item._id || item.id || item.productId || item.product?._id || item.product;

export const getSelection = (item) => ({
	size: norm(item.size),
	color: norm(item.color),
	style: norm(item.style),
});

export const variantDecrementFilter = (productId, selection, quantity) => ({
	_id: productId,
	variants: {
		$elemMatch: {
			size: selection.size,
			color: selection.color,
			stock: { $gte: quantity },
		},
	},
});

export const variantDecrementUpdate = (quantity) => ({
	$inc: { "variants.$.stock": -quantity, stock: -quantity },
});

export const productDecrementFilter = (productId, quantity) => ({
	_id: productId,
	$or: [{ variants: { $exists: false } }, { variants: { $size: 0 } }],
	stock: { $gte: quantity },
});

export const reserveStockForProducts = async (products = []) => {
	if (!Array.isArray(products) || products.length === 0) {
		return { ok: false, message: "No products provided" };
	}

	const reserved = [];

	for (const item of products) {
		const productId = getProductId(item);
		const quantity = Number(item.quantity || 1);
		const selection = getSelection(item);

		if (!productId || quantity < 1) {
			await restoreStockForProducts(reserved);
			return { ok: false, message: "Invalid product or quantity" };
		}

		const product = await Product.findById(productId);
		if (!product) {
			await restoreStockForProducts(reserved);
			return { ok: false, message: `Product not found (${productId})` };
		}

		const label = [product.name, selection.size, selection.color]
			.filter(Boolean)
			.join(" / ");

		let updated;
		if (product.variants?.length) {
			updated = await Product.findOneAndUpdate(
				variantDecrementFilter(productId, selection, quantity),
				variantDecrementUpdate(quantity),
				{ new: true }
			);
		} else {
			updated = await Product.findOneAndUpdate(
				productDecrementFilter(productId, quantity),
				{ $inc: { stock: -quantity } },
				{ new: true }
			);
		}

		if (!updated) {
			await restoreStockForProducts(reserved);
			const available = getVariantStock(product, selection);
			return {
				ok: false,
				message:
					available < quantity
						? `"${label}" has only ${available} left in stock`
						: "Stock changed while placing order. Please try again.",
			};
		}

		reserved.push({
			...item,
			_id: productId,
			id: productId,
			quantity,
			size: selection.size,
			color: selection.color,
		});
	}

	return { ok: true };
};

export const restoreStockForProducts = async (products = []) => {
	for (const item of products) {
		const productId = getProductId(item);
		const quantity = Number(item.quantity || 1);
		if (!productId || quantity < 1) continue;

		const selection = getSelection(item);
		const product = await Product.findById(productId);
		if (!product) continue;

		if (product.variants?.length) {
			const updated = await Product.findOneAndUpdate(
				{
					_id: productId,
					variants: {
						$elemMatch: { size: selection.size, color: selection.color },
					},
				},
				{ $inc: { "variants.$.stock": quantity, stock: quantity } },
				{ new: true }
			);
			if (!updated) {
				product.variants.push({
					size: selection.size,
					color: selection.color,
					stock: quantity,
				});
				product.stock = totalVariantStock(product.variants);
				await product.save();
			}
		} else {
			await Product.findByIdAndUpdate(productId, { $inc: { stock: quantity } });
		}
	}
	return { ok: true };
};

export { findVariant, getVariantStock, sameVariant };
