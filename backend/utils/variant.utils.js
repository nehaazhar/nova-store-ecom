export const norm = (value) => String(value || "").trim();

/** Inventory SKU key = size + color (style is display-only, not stocked separately) */
export const variantKey = ({ size = "", color = "" } = {}) =>
	`${norm(size)}|${norm(color)}`;

export const sameVariant = (a = {}, b = {}) =>
	norm(a.size) === norm(b.size) && norm(a.color) === norm(b.color);

const asOptionList = (arr) => {
	const list = Array.isArray(arr)
		? [...new Set(arr.map((v) => norm(v)).filter(Boolean))]
		: [];
	return list.length ? list : [""];
};

export const buildVariantsFromOptions = (
	sizes = [],
	colors = [],
	defaultStock = 10,
	existingVariants = []
) => {
	const sizeList = asOptionList(sizes);
	const colorList = asOptionList(colors);
	const stockMap = new Map(
		(existingVariants || []).map((v) => [variantKey(v), Number(v.stock) || 0])
	);
	const defaultValue = Math.max(0, Number(defaultStock) || 0);

	const variants = [];
	for (const size of sizeList) {
		for (const color of colorList) {
			const key = variantKey({ size, color });
			variants.push({
				size,
				color,
				stock: stockMap.has(key) ? stockMap.get(key) : defaultValue,
			});
		}
	}
	return variants;
};

export const syncOptionListsFromVariants = (variants = [], styles = []) => {
	const sizes = [
		...new Set(variants.map((v) => norm(v.size)).filter(Boolean)),
	];
	const colors = [
		...new Set(variants.map((v) => norm(v.color)).filter(Boolean)),
	];
	const styleList = Array.isArray(styles)
		? [...new Set(styles.map((v) => norm(v)).filter(Boolean))]
		: [];
	return { sizes, colors, styles: styleList };
};

export const totalVariantStock = (variants = []) =>
	(variants || []).reduce((sum, v) => sum + Math.max(0, Number(v.stock) || 0), 0);

export const findVariant = (product, selection = {}) => {
	const variants = product?.variants || [];
	if (!variants.length) return null;
	return variants.find((v) => sameVariant(v, selection)) || null;
};

export const getVariantStock = (product, selection = {}) => {
	const variant = findVariant(product, selection);
	if (variant) return Math.max(0, Number(variant.stock) || 0);
	return Math.max(0, Number(product?.stock) || 0);
};

export const availableSizes = (product, { color } = {}) => {
	const variants = product?.variants || [];
	if (!variants.length) return product?.sizes || [];
	return [
		...new Set(
			variants
				.filter((v) => {
					if ((Number(v.stock) || 0) <= 0) return false;
					if (color && norm(v.color) !== norm(color)) return false;
					return Boolean(norm(v.size));
				})
				.map((v) => v.size)
		),
	];
};

export const availableColors = (product, { size } = {}) => {
	const variants = product?.variants || [];
	if (!variants.length) return product?.colors || [];
	return [
		...new Set(
			variants
				.filter((v) => {
					if ((Number(v.stock) || 0) <= 0) return false;
					if (size && norm(v.size) !== norm(size)) return false;
					return Boolean(norm(v.color));
				})
				.map((v) => v.color)
		),
	];
};

/** Styles are options only — always available if listed on product */
export const availableStyles = (product) => product?.styles || [];

export const normalizeIncomingVariants = (variants = []) =>
	(Array.isArray(variants) ? variants : [])
		.map((v) => ({
			size: norm(v.size),
			color: norm(v.color),
			stock: Math.max(0, Number(v.stock) || 0),
		}))
		.filter((v) => v.size || v.color || v.stock >= 0);
