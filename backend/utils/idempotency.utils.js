export const STRIPE_EVENT_TTL_SECONDS = 60 * 60 * 24 * 7;

export const stripeEventCacheKey = (eventId) => `stripe:event:${eventId}`;

export const claimOnce = async (redisClient, key, ttlSeconds) => {
	if (!redisClient || !key) return true;
	try {
		const result = await redisClient.set(key, "1", "EX", ttlSeconds, "NX");
		return result === "OK";
	} catch (error) {
		console.error("claimOnce redis error:", error.message);
		return true;
	}
};

export const isDuplicateKeyError = (error) =>
	Boolean(error && (error.code === 11000 || error.codeName === "DuplicateKey"));
