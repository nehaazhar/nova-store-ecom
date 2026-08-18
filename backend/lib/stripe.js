import Stripe from "stripe";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const getStripeCurrency = () =>
	String(process.env.STRIPE_CURRENCY || "inr").trim().toLowerCase() || "inr";

export const isStripeConfigured = () => {
	const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
	if (!key.startsWith("sk_test_") && !key.startsWith("sk_live_")) return false;
	if (key.length < 30) return false;
	if (/dummy|placeholder|your_stripe/i.test(key)) return false;
	return true;
};

let stripeClient = null;

export const getStripe = () => {
	if (!isStripeConfigured()) return null;
	if (!stripeClient) {
		stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY.trim());
	}
	return stripeClient;
};
