import { redis } from "../lib/redis.js";

const CHECKOUT_TTL_SECONDS = 60 * 60 * 24;

export const checkoutPayloadKey = (id) => `checkout:payload:${id}`;

export const saveCheckoutPayload = async (id, payload) => {
	await redis.set(
		checkoutPayloadKey(id),
		JSON.stringify(payload),
		"EX",
		CHECKOUT_TTL_SECONDS
	);
};

export const loadCheckoutPayload = async (id) => {
	if (!id) return null;
	const raw = await redis.get(checkoutPayloadKey(id));
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
};

export const deleteCheckoutPayload = async (id) => {
	if (!id) return;
	try {
		await redis.del(checkoutPayloadKey(id));
	} catch (error) {
		console.error("deleteCheckoutPayload:", error.message);
	}
};
