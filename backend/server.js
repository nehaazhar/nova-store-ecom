import "./polyfills/nodeCompat.js";
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.route.js";
import productRoutes from "./routes/product.route.js";
import cartRoutes from "./routes/cart.route.js";
import couponRoutes from "./routes/coupon.route.js";
import paymentRoutes from "./routes/payment.route.js";
import analyticsRoutes from "./routes/analytics.route.js";
import orderRoutes from "./routes/order.route.js";
import reviewRoutes from "./routes/review.route.js";
import wishlistRoutes from "./routes/wishlist.route.js";
import addressRoutes from "./routes/address.route.js";

import { connectDB } from "./lib/db.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";
import { apiLimiter } from "./middleware/rateLimit.middleware.js";
import helmet from "helmet";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);
app.use(
	helmet({
		contentSecurityPolicy: false,
		crossOriginEmbedderPolicy: false,
	})
);

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(
	cors({
		origin: process.env.CLIENT_URL || "http://localhost:5173",
		credentials: true,
	})
);
app.get("/api/health", (req, res) => {
	res.json({ ok: true });
});
app.use("/api", apiLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api", notFound);
app.use(errorHandler);

if (process.env.NODE_ENV === "production") {
	const frontendDist = path.resolve(__dirname, "../frontend/dist");
	app.use(express.static(frontendDist));

	app.get("*", (req, res) => {
		res.sendFile(path.join(frontendDist, "index.html"));
	});
}

app.listen(PORT, () => {
	console.log("Server is running on http://localhost:" + PORT);
	connectDB();
});
