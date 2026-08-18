import test from "node:test";
import assert from "node:assert/strict";
import {
	variantDecrementFilter,
	variantDecrementUpdate,
	productDecrementFilter,
} from "../utils/inventory.utils.js";

test("variant decrement filter requires matching SKU with enough stock", () => {
	const filter = variantDecrementFilter("prod1", { size: "M", color: "Black" }, 2);
	assert.equal(filter._id, "prod1");
	assert.deepEqual(filter.variants.$elemMatch, {
		size: "M",
		color: "Black",
		stock: { $gte: 2 },
	});
});

test("variant decrement update uses positional $inc", () => {
	assert.deepEqual(variantDecrementUpdate(3), {
		$inc: { "variants.$.stock": -3, stock: -3 },
	});
});

test("product-level decrement only matches documents without variants", () => {
	const filter = productDecrementFilter("prod1", 1);
	assert.equal(filter.stock.$gte, 1);
	assert.ok(filter.$or);
});
