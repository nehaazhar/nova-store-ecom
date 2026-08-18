import crypto from "crypto";

export const hashToken = (token) =>
	crypto.createHash("sha256").update(String(token)).digest("hex");

export const createRandomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");

export const toPublicUser = (user) => {
	if (!user) return null;
	const doc = typeof user.toObject === "function" ? user.toObject() : user;
	return {
		_id: doc._id,
		name: doc.name,
		email: doc.email,
		role: doc.role,
		isEmailVerified: doc.isEmailVerified !== false,
		createdAt: doc.createdAt,
	};
};

export const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
