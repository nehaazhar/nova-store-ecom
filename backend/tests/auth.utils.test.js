import test from "node:test";
import assert from "node:assert/strict";
import { createRandomToken, hashToken, toPublicUser } from "../utils/auth.utils.js";

test("hashToken is deterministic and hides the raw token", () => {
	const token = "reset-secret";
	assert.equal(hashToken(token), hashToken(token));
	assert.notEqual(hashToken(token), token);
	assert.equal(hashToken(token).length, 64);
});

test("createRandomToken returns unique hex strings", () => {
	const a = createRandomToken();
	const b = createRandomToken();
	assert.notEqual(a, b);
	assert.match(a, /^[a-f0-9]+$/);
});

test("toPublicUser strips secrets", () => {
	const publicUser = toPublicUser({
		_id: "1",
		name: "Ada",
		email: "ada@example.com",
		role: "customer",
		isEmailVerified: true,
		password: "hash",
		passwordResetTokenHash: "secret",
	});
	assert.equal(publicUser.name, "Ada");
	assert.equal(publicUser.password, undefined);
	assert.equal(publicUser.passwordResetTokenHash, undefined);
});

test("toPublicUser treats missing verification flag as verified", () => {
	const publicUser = toPublicUser({ name: "Old", email: "old@example.com", role: "customer" });
	assert.equal(publicUser.isEmailVerified, true);
});
