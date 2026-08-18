import test from "node:test";
import assert from "node:assert/strict";
import {
	claimOnce,
	isDuplicateKeyError,
	stripeEventCacheKey,
} from "../utils/idempotency.utils.js";

test("stripe event cache key is namespaced", () => {
	assert.equal(stripeEventCacheKey("evt_123"), "stripe:event:evt_123");
});

test("claimOnce returns true only on first SET NX", async () => {
	const store = new Map();
	const redis = {
		set: async (key, value, _ex, _ttl, nx) => {
			assert.equal(nx, "NX");
			if (store.has(key)) return null;
			store.set(key, value);
			return "OK";
		},
	};

	assert.equal(await claimOnce(redis, "stripe:event:evt_1", 60), true);
	assert.equal(await claimOnce(redis, "stripe:event:evt_1", 60), false);
	assert.equal(await claimOnce(redis, "stripe:event:evt_2", 60), true);
});

test("claimOnce fails open if Redis throws", async () => {
	const redis = {
		set: async () => {
			throw new Error("redis down");
		},
	};
	assert.equal(await claimOnce(redis, "k", 10), true);
});

test("duplicate key helper recognizes Mongo 11000", () => {
	assert.equal(isDuplicateKeyError({ code: 11000 }), true);
	assert.equal(isDuplicateKeyError({ codeName: "DuplicateKey" }), true);
	assert.equal(isDuplicateKeyError({ code: 1 }), false);
});
