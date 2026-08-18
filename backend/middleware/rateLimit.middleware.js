import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 300,
	standardHeaders: true,
	legacyHeaders: false,
	message: { message: "Too many requests. Please try again later." },
});

export const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 20,
	standardHeaders: true,
	legacyHeaders: false,
	message: { message: "Too many auth attempts. Please wait and try again." },
});
