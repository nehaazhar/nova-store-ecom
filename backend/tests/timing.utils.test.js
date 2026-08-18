import test from "node:test";
import assert from "node:assert/strict";
import { debounce, throttle } from "../../frontend/src/utils/timing.utils.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("debounce only runs after quiet period", async () => {
	let count = 0;
	const fn = debounce(() => {
		count += 1;
	}, 40);

	fn();
	fn();
	fn();
	assert.equal(count, 0);
	await wait(70);
	assert.equal(count, 1);
	fn.cancel();
});

test("throttle limits how often fn runs", async () => {
	let count = 0;
	const fn = throttle(() => {
		count += 1;
	}, 50);

	fn();
	fn();
	fn();
	assert.equal(count, 1);
	await wait(80);
	assert.equal(count, 2);
	fn.cancel();
});
