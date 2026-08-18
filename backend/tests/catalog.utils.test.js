import test from "node:test";
import assert from "node:assert/strict";
import { buildCatalogMongoQuery, catalogCacheKey } from "../utils/catalog.utils.js";

test("shop search uses regex substring match by default", () => {
	const { filter, useTextSearch } = buildCatalogMongoQuery({
		search: "jacket",
		sort: "newest",
	});
	assert.equal(useTextSearch, false);
	assert.ok(filter.$or);
	assert.equal(filter.$or[0].name.$options, "i");
});

test("relevance sort uses Mongo text index", () => {
	const { filter, sortOption, projection, useTextSearch } = buildCatalogMongoQuery({
		search: "leather jacket",
		sort: "relevance",
	});
	assert.equal(useTextSearch, true);
	assert.deepEqual(filter.$text, { $search: "leather jacket" });
	assert.deepEqual(sortOption, { score: { $meta: "textScore" } });
	assert.deepEqual(projection, { score: { $meta: "textScore" } });
});

test("price and category filters compose with search", () => {
	const { filter } = buildCatalogMongoQuery({
		search: "bag",
		category: "bags",
		minPrice: 10,
		maxPrice: 50,
		sort: "price-asc",
	});
	assert.equal(filter.price.$gte, 10);
	assert.equal(filter.price.$lte, 50);
	assert.match(filter.category.$regex, /bags/);
});

test("catalog cache key is stable for the same params", () => {
	const a = catalogCacheKey("1", { search: "x", page: 1 });
	const b = catalogCacheKey("1", { search: "x", page: 1 });
	const c = catalogCacheKey("1", { search: "y", page: 1 });
	assert.equal(a, b);
	assert.notEqual(a, c);
});
