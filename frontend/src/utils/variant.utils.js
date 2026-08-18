export const norm = (value) => String(value || "").trim();

export const sameVariant = (a = {}, b = {}) =>
	norm(a.size) === norm(b.size) && norm(a.color) === norm(b.color);

export const getVariantStock = (product, selection = {}) => {
	const variants = product?.variants || [];
	if (!variants.length) return Math.max(0, Number(product?.stock) || 0);
	const match = variants.find((v) => sameVariant(v, selection));
	return match ? Math.max(0, Number(match.stock) || 0) : 0;
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

export const availableStyles = (product) => product?.styles || [];

export const buildVariantsFromOptions = (
	sizes = [],
	colors = [],
	defaultStock = 10,
	existing = []
) => {
	const sizeList = sizes.length ? sizes : [""];
	const colorList = colors.length ? colors : [""];
	const map = new Map(
		(existing || []).map((v) => [
			`${norm(v.size)}|${norm(v.color)}`,
			Number(v.stock) || 0,
		])
	);
	const out = [];
	for (const size of sizeList) {
		for (const color of colorList) {
			const key = `${norm(size)}|${norm(color)}`;
			out.push({
				size,
				color,
				stock: map.has(key) ? map.get(key) : Number(defaultStock) || 0,
			});
		}
	}
	return out;
};
