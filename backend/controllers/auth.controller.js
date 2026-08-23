import { redis } from "../lib/redis.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { HttpError } from "../middleware/error.middleware.js";
import {
	createRandomToken,
	hashToken,
	normalizeEmail,
	toPublicUser,
} from "../utils/auth.utils.js";
import { isSmtpConfigured, sendPasswordResetEmail, sendVerificationEmail } from "../utils/email.utils.js";

const VERIFY_EXPIRES_MS = 24 * 60 * 60 * 1000;
const RESET_EXPIRES_MS = 60 * 60 * 1000;
const GENERIC_RESET_MESSAGE =
	"If an account exists for that email, we sent password reset instructions.";
const GENERIC_VERIFY_MESSAGE =
	"If an account exists for that email, we sent a verification link.";

const clientUrl = () => process.env.CLIENT_URL || "http://localhost:5173";

const generateTokens = (userId) => {
	const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
		expiresIn: "15m",
	});

	const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
		expiresIn: "7d",
	});

	return { accessToken, refreshToken };
};

const storeRefreshToken = async (userId, refreshToken) => {
	await redis.set(`refresh_token:${userId}`, refreshToken, "EX", 7 * 24 * 60 * 60);
};

const setCookies = (res, accessToken, refreshToken) => {
	res.cookie("accessToken", accessToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict",
		maxAge: 15 * 60 * 1000,
	});
	res.cookie("refreshToken", refreshToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict",
		maxAge: 7 * 24 * 60 * 60 * 1000,
	});
};

const issueSession = async (res, user) => {
	const { accessToken, refreshToken } = generateTokens(user._id);
	await storeRefreshToken(user._id, refreshToken);
	setCookies(res, accessToken, refreshToken);
};

const issueEmailToken = async (user, { hashField, expiresField, ttlMs }) => {
	const token = createRandomToken();
	user[hashField] = hashToken(token);
	user[expiresField] = new Date(Date.now() + ttlMs);
	await user.save();
	return token;
};

export const signup = async (req, res) => {
	const name = String(req.body.name || "").trim();
	const email = normalizeEmail(req.body.email);
	const password = String(req.body.password || "");

	if (!name || !email || !password) {
		throw new HttpError(400, "Name, email, and password are required");
	}
	if (password.length < 6) {
		throw new HttpError(400, "Password must be at least 6 characters long");
	}

	const userExists = await User.findOne({ email });
	if (userExists) {
		throw new HttpError(400, "User already exists");
	}

	const user = new User({
		name,
		email,
		password,
		isEmailVerified: true,
	});
	await user.save();
	await issueSession(res, user);
	res.status(201).json(toPublicUser(user));
};

export const login = async (req, res) => {
	const email = normalizeEmail(req.body.email);
	const password = String(req.body.password || "");
	const user = await User.findOne({ email });

	if (!user || !(await user.comparePassword(password))) {
		throw new HttpError(400, "Invalid email or password");
	}

	await issueSession(res, user);
	res.json(toPublicUser(user));
};

export const logout = async (req, res) => {
	const refreshToken = req.cookies.refreshToken;
	if (refreshToken) {
		try {
			const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
			await redis.del(`refresh_token:${decoded.userId}`);
		} catch {
			// still clear cookies
		}
	}

	res.clearCookie("accessToken");
	res.clearCookie("refreshToken");
	res.json({ message: "Logged out successfully" });
};

export const refreshToken = async (req, res) => {
	const token = req.cookies.refreshToken;
	if (!token) {
		throw new HttpError(401, "No refresh token provided");
	}

	const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
	const storedToken = await redis.get(`refresh_token:${decoded.userId}`);
	if (storedToken !== token) {
		throw new HttpError(401, "Invalid refresh token");
	}

	const accessToken = jwt.sign({ userId: decoded.userId }, process.env.ACCESS_TOKEN_SECRET, {
		expiresIn: "15m",
	});

	res.cookie("accessToken", accessToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict",
		maxAge: 15 * 60 * 1000,
	});
	res.json({ message: "Token refreshed successfully" });
};

export const getProfile = async (req, res) => {
	res.json(toPublicUser(req.user));
};

export const updateProfile = async (req, res) => {
	const name = String(req.body.name || "").trim();
	if (!name) {
		throw new HttpError(400, "Name is required");
	}

	req.user.name = name;
	await req.user.save();
	res.json(toPublicUser(req.user));
};

export const changePassword = async (req, res) => {
	const currentPassword = String(req.body.currentPassword || "");
	const newPassword = String(req.body.newPassword || "");

	if (!currentPassword || !newPassword) {
		throw new HttpError(400, "Current and new password are required");
	}
	if (newPassword.length < 6) {
		throw new HttpError(400, "Password must be at least 6 characters long");
	}

	const user = await User.findById(req.user._id);
	if (!user || !(await user.comparePassword(currentPassword))) {
		throw new HttpError(400, "Current password is incorrect");
	}

	user.password = newPassword;
	await user.save();
	res.json({ message: "Password updated" });
};

export const verifyEmail = async (req, res) => {
	const token = String(req.body.token || req.query.token || "");
	if (!token) {
		throw new HttpError(400, "Verification token is required");
	}

	const user = await User.findOne({
		emailVerifyTokenHash: hashToken(token),
		emailVerifyExpires: { $gt: new Date() },
	}).select("+emailVerifyTokenHash +emailVerifyExpires");

	if (!user) {
		throw new HttpError(400, "Invalid or expired verification link");
	}

	user.isEmailVerified = true;
	await user.save();

	res.json({ message: "Email verified. You can log in now." });
};

export const resendVerification = async (req, res) => {
	const email = normalizeEmail(req.body.email);
	if (!email) {
		throw new HttpError(400, "Email is required");
	}

	const user = await User.findOne({ email }).select("+emailVerifyTokenHash +emailVerifyExpires");
	if (user && user.isEmailVerified === false) {
		const token = await issueEmailToken(user, {
			hashField: "emailVerifyTokenHash",
			expiresField: "emailVerifyExpires",
			ttlMs: VERIFY_EXPIRES_MS,
		});
		await sendVerificationEmail({
			to: email,
			name: user.name,
			verifyUrl: `${clientUrl()}/verify-email?token=${token}`,
		});
	}

	res.json({ message: GENERIC_VERIFY_MESSAGE });
};

export const forgotPassword = async (req, res) => {
	const email = normalizeEmail(req.body.email);
	if (!email) {
		throw new HttpError(400, "Email is required");
	}

	const user = await User.findOne({ email }).select(
		"+passwordResetTokenHash +passwordResetExpires"
	);
	if (user) {
		const token = await issueEmailToken(user, {
			hashField: "passwordResetTokenHash",
			expiresField: "passwordResetExpires",
			ttlMs: RESET_EXPIRES_MS,
		});
		await sendPasswordResetEmail({
			to: email,
			name: user.name,
			resetUrl: `${clientUrl()}/reset-password?token=${token}`,
		});
	}

	res.json({ message: GENERIC_RESET_MESSAGE });
};

export const resetPassword = async (req, res) => {
	const token = String(req.body.token || "");
	const newPassword = String(req.body.password || req.body.newPassword || "");

	if (!token || !newPassword) {
		throw new HttpError(400, "Token and new password are required");
	}
	if (newPassword.length < 6) {
		throw new HttpError(400, "Password must be at least 6 characters long");
	}

	const user = await User.findOne({
		passwordResetTokenHash: hashToken(token),
		passwordResetExpires: { $gt: new Date() },
	}).select("+passwordResetTokenHash +passwordResetExpires");

	if (!user) {
		throw new HttpError(400, "Invalid or expired reset link");
	}

	user.password = newPassword;
	user.passwordResetTokenHash = "";
	user.passwordResetExpires = undefined;
	await user.save();

	res.json({ message: "Password reset successful. You can log in now." });
};
