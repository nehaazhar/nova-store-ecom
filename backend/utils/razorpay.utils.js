import crypto from "crypto";

const cleanEnv = (value) =>
	String(value || "")
		.trim()
		.replace(/^['"]|['"]$/g, "")
		.trim();

export const getRazorpayKeyId = () => cleanEnv(process.env.RAZORPAY_KEY_ID);
export const getRazorpaySecret = () => cleanEnv(process.env.RAZORPAY_KEY_SECRET);

export const isRazorpayConfigured = () => {
	const keyId = getRazorpayKeyId();
	const secret = getRazorpaySecret();
	if (!keyId.startsWith("rzp_test_") && !keyId.startsWith("rzp_live_")) return false;
	if (secret.length < 10) return false;
	if (/dummy|placeholder|your_razorpay/i.test(keyId + secret)) return false;
	return true;
};

export const getRazorpayAuthHeader = () => {
	const keyId = getRazorpayKeyId();
	const secret = getRazorpaySecret();
	return `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`;
};

export const verifyRazorpaySignature = ({ orderId, paymentId, signature, secret }) => {
	const body = `${orderId}|${paymentId}`;
	const expected = crypto
		.createHmac("sha256", secret)
		.update(body)
		.digest("hex");
	const a = Buffer.from(expected);
	const b = Buffer.from(String(signature || ""));
	if (a.length !== b.length) return false;
	return crypto.timingSafeEqual(a, b);
};

export const createRazorpayOrder = async ({ amountPaise, receipt, notes = {} }) => {
	const res = await fetch("https://api.razorpay.com/v1/orders", {
		method: "POST",
		headers: {
			Authorization: getRazorpayAuthHeader(),
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			amount: amountPaise,
			currency: "INR",
			receipt,
			notes,
		}),
	});
	const data = await res.json();
	if (!res.ok) {
		throw new Error(data?.error?.description || "Failed to create Razorpay order");
	}
	return data;
};

export const refundRazorpayPayment = async (paymentId) => {
	const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
		method: "POST",
		headers: {
			Authorization: getRazorpayAuthHeader(),
			"Content-Type": "application/json",
		},
		body: JSON.stringify({}),
	});
	const data = await res.json();
	if (!res.ok) {
		throw new Error(data?.error?.description || "Failed to refund Razorpay payment");
	}
	return data;
};
