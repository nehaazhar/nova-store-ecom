import nodemailer from "nodemailer";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";

const envVal = (key) =>
	String(process.env[key] || "")
		.trim()
		.replace(/^['"]|['"]$/g, "")
		.trim();

const smtpPass = () => envVal("SMTP_PASS").replace(/\s/g, "");

export const isSmtpConfigured = () =>
	Boolean(envVal("SMTP_HOST") && envVal("SMTP_USER") && smtpPass());

export const isHttpsEmailConfigured = () =>
	Boolean(
		envVal("RESEND_API_KEY") ||
			envVal("SENDGRID_API_KEY") ||
			envVal("BREVO_API_KEY") ||
			envVal("EMAIL_WEBHOOK_URL")
	);

export const isEmailConfigured = () => isHttpsEmailConfigured() || isSmtpConfigured();

const extractEmailAddress = (from) => {
	const match = String(from || "").match(/<([^>]+)>/);
	return (match ? match[1] : from || "").trim();
};

const sendViaResend = async ({ to, subject, text, html }) => {
	const key = envVal("RESEND_API_KEY");
	if (!key) return null;
	const from = envVal("RESEND_FROM") || "NOVA <beth.t@example.com>";
	const res = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${key}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from,
			to: [to],
			subject,
			html: html || `<p>${text || subject}</p>`,
			text: text || subject,
		}),
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		const msg =
			data.message ||
			(typeof data.error === "string" ? data.error : data.error?.message) ||
			`Resend HTTP ${res.status}`;
		return { ok: false, error: msg };
	}
	return { ok: true, mocked: false, via: "resend", id: data.id || "" };
};

const sendViaSendGrid = async ({ from, to, subject, text, html }) => {
	const key = envVal("SENDGRID_API_KEY");
	if (!key) return null;
	const fromEmail = extractEmailAddress(from);
	const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${key}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			personalizations: [{ to: [{ email: to }] }],
			from: { email: fromEmail, name: "NOVA" },
			subject,
			content: [
				{ type: "text/plain", value: text || subject },
				{ type: "text/html", value: html || `<p>${text || subject}</p>` },
			],
		}),
	});
	if (!res.ok) {
		const errText = await res.text();
		return { ok: false, error: errText || `SendGrid HTTP ${res.status}` };
	}
	return { ok: true, mocked: false, via: "sendgrid" };
};

const sendViaBrevo = async ({ from, to, subject, text, html }) => {
	const key = envVal("BREVO_API_KEY");
	if (!key) return null;
	const fromEmail = extractEmailAddress(from);
	const res = await fetch("https://api.brevo.com/v3/smtp/email", {
		method: "POST",
		headers: {
			"api-key": key,
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify({
			sender: { name: "NOVA", email: fromEmail },
			to: [{ email: to }],
			subject,
			htmlContent: html || `<p>${text || subject}</p>`,
			textContent: text || subject,
		}),
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		return {
			ok: false,
			error: data.message || data.error?.message || `Brevo HTTP ${res.status}`,
		};
	}
	return { ok: true, mocked: false, via: "brevo" };
};

const sendViaWebhook = async ({ from, to, subject, text, html }) => {
	const url = envVal("EMAIL_WEBHOOK_URL");
	if (!url) return null;
	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ from, to, subject, text, html }),
	});
	if (!res.ok) {
		const errText = await res.text();
		return { ok: false, error: errText || `Webhook HTTP ${res.status}` };
	}
	return { ok: true, mocked: false, via: "webhook" };
};

const createSmtpTransport = (port) => {
	const SMTP_HOST = envVal("SMTP_HOST");
	const SMTP_USER = envVal("SMTP_USER");
	const SMTP_PASS = smtpPass();
	const usePort = Number(port || envVal("SMTP_PORT") || 587);
	const isGmail = /gmail\.com/i.test(SMTP_HOST) || /gmail\.com/i.test(SMTP_USER);

	if (isGmail && usePort === 465) {
		return nodemailer.createTransport({
			host: "smtp.gmail.com",
			port: 465,
			secure: true,
			family: 4,
			auth: { user: SMTP_USER, pass: SMTP_PASS },
			connectionTimeout: 20000,
			socketTimeout: 20000,
		});
	}

	if (isGmail) {
		return nodemailer.createTransport({
			service: "gmail",
			auth: { user: SMTP_USER, pass: SMTP_PASS },
			connectionTimeout: 20000,
			greetingTimeout: 20000,
			socketTimeout: 20000,
		});
	}

	return nodemailer.createTransport({
		host: SMTP_HOST,
		port: usePort,
		secure: usePort === 465,
		requireTLS: usePort === 587,
		family: 4,
		auth: { user: SMTP_USER, pass: SMTP_PASS },
		connectionTimeout: 20000,
		greetingTimeout: 20000,
		socketTimeout: 20000,
	});
};

let transporter = null;

const getTransporter = () => {
	if (transporter) return transporter;
	if (!isSmtpConfigured()) return null;
	transporter = createSmtpTransport();
	return transporter;
};

const mailFrom = () => {
	const user = envVal("SMTP_USER");
	if (envVal("RESEND_API_KEY") && (!envVal("EMAIL_FROM") || /gmail\.com/i.test(envVal("EMAIL_FROM") + user))) {
		return "NOVA <beth.t@example.com>";
	}
	const from = envVal("EMAIL_FROM") || user || "noreply@ecommerce.local";
	if (user && !from.toLowerCase().includes(user.toLowerCase())) {
		return `NOVA <${user}>`;
	}
	return from;
};

const escapeHtml = (value = "") =>
	String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

const escapeAttr = (value = "") =>
	String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const formatAddressLines = (address) => {
	if (!address) return [];
	return [
		address.fullName,
		address.phone,
		[address.line1, address.line2].filter(Boolean).join(", "),
		`${address.city}, ${address.state} ${address.postalCode}`,
		address.country,
	].filter(Boolean);
};

const EVENT_META = {
	placed: {
		eyebrow: "Order confirmed",
		title: "Thanks for your order!",
		accent: "#10b981",
		badgeBg: "#ecfdf5",
		badgeText: "#047857",
		message: (id, total) =>
			`We've received your order <strong>#${id}</strong>. Total paid: <strong>₹${total}</strong>. We'll notify you when it ships.`,
	},
	processing: {
		eyebrow: "Being packed",
		title: "Your order is being processed",
		accent: "#0f766e",
		badgeBg: "#f0fdfa",
		badgeText: "#0f766e",
		message: (id) =>
			`We're preparing order <strong>#${id}</strong>. We'll email you again when it ships.`,
	},
	shipped: {
		eyebrow: "On the way",
		title: "Your order has shipped",
		accent: "#3b82f6",
		badgeBg: "#eff6ff",
		badgeText: "#1d4ed8",
		message: (id) =>
			`Good news — order <strong>#${id}</strong> is on its way to you.`,
	},
	delivered: {
		eyebrow: "Delivered",
		title: "Your order arrived",
		accent: "#10b981",
		badgeBg: "#ecfdf5",
		badgeText: "#047857",
		message: (id) =>
			`Order <strong>#${id}</strong> has been delivered. We hope you love it!`,
	},
	cancelled: {
		eyebrow: "Cancelled",
		title: "Order cancelled",
		accent: "#ef4444",
		badgeBg: "#fef2f2",
		badgeText: "#b91c1c",
		message: (id) =>
			`Your order <strong>#${id}</strong> has been cancelled. If payment was taken, refund will follow store policy.`,
	},
	return_requested: {
		eyebrow: "Return requested",
		title: "We got your return request",
		accent: "#f59e0b",
		badgeBg: "#fffbeb",
		badgeText: "#b45309",
		message: (id) =>
			`We've received your return request for order <strong>#${id}</strong>. Our team will review it shortly.`,
	},
	return_approved: {
		eyebrow: "Return approved",
		title: "Return approved",
		accent: "#10b981",
		badgeBg: "#ecfdf5",
		badgeText: "#047857",
		message: (id) =>
			`Your return for order <strong>#${id}</strong> was approved. Inventory has been updated.`,
	},
	return_rejected: {
		eyebrow: "Return update",
		title: "Return not approved",
		accent: "#ef4444",
		badgeBg: "#fef2f2",
		badgeText: "#b91c1c",
		message: (id) =>
			`Unfortunately, the return for order <strong>#${id}</strong> was not approved.`,
	},
};

const getProductImageUrl = (product) => {
	if (!product) return null;
	const raw = product.images?.[0] || product.image || null;
	if (!raw || typeof raw !== "string") return null;
	const url = raw.trim();
	if (url.startsWith("https://") || url.startsWith("http://")) return url;
	return null;
};

const toThumbnailUrl = (url) => {
	if (!url) return null;
	// Cloudinary: force small jpeg for email clients
	if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
		return url.replace("/upload/", "/upload/c_fill,w_112,h_112,f_jpg,q_auto/");
	}
	// Unsplash: request a small fixed size
	if (url.includes("images.unsplash.com")) {
		const base = url.split("?")[0];
		return `${base}?auto=format&fit=crop&w=112&h=112&q=80`;
	}
	return url;
};

const hydrateOrderProducts = async (orderProducts = []) => {
	const ids = orderProducts
		.map((item) => item.product?._id || item.product)
		.filter(Boolean);

	const docs = await Product.find({ _id: { $in: ids } }).select("name images image");
	const byId = new Map(docs.map((p) => [p._id.toString(), p]));

	return orderProducts.map((item) => {
		const id = (item.product?._id || item.product)?.toString();
		const product = byId.get(id) || item.product || null;
		return {
			quantity: item.quantity,
			price: item.price,
			size: item.size || "",
			color: item.color || "",
			style: item.style || "",
			product: product
				? {
						_id: product._id,
						name: product.name,
						images: product.images,
						image: product.image,
						imageUrl: toThumbnailUrl(getProductImageUrl(product)),
				  }
				: { name: "Product", imageUrl: null },
		};
	});
};

const fetchImageAttachment = async (imageUrl, index) => {
	if (!imageUrl) return null;
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 12000);
		const res = await fetch(imageUrl, {
			signal: controller.signal,
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
			},
		});
		clearTimeout(timeout);
		if (!res.ok) {
			console.log("Email image HTTP", res.status, imageUrl);
			return null;
		}

		const contentType = (res.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
		const buffer = Buffer.from(await res.arrayBuffer());
		if (!buffer.length) return null;

		const cid = `product${index}`;
		const ext = contentType.includes("png")
			? "png"
			: contentType.includes("webp")
				? "webp"
				: "jpg";

		return {
			filename: `product-${index}.${ext}`,
			content: buffer,
			contentType,
			cid,
		};
	} catch (error) {
		console.log("Email image fetch failed:", imageUrl, error.message);
		return null;
	}
};

const buildProductRows = (products = []) => {
	if (!products.length) return "";

	const rows = products
		.map((item) => {
			const product = item.product || {};
			const name = escapeHtml(product.name || "Product");
			const qty = Number(item.quantity || 1);
			const price = Number(item.price || 0).toFixed(2);
			const lineTotal = (qty * Number(item.price || 0)).toFixed(2);

			const remote = product.imageUrl ? escapeAttr(product.imageUrl) : "";
			const cidSrc = item.cid ? `cid:${item.cid}` : "";
			const primarySrc = cidSrc || remote;

			const imageCell = primarySrc
				? `<img src="${primarySrc}" alt="${name}" width="64" height="64" style="display:block;width:64px;height:64px;border-radius:8px;border:1px solid #e5e7eb;background:#f3f4f6;" />`
				: `<div style="width:64px;height:64px;border-radius:8px;background:#e5e7eb;color:#6b7280;font-size:10px;text-align:center;line-height:64px;">No img</div>`;

			return `
				<tr>
					<td style="padding:14px 0;border-bottom:1px solid #e5e7eb;vertical-align:top;">
						<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
							<tr>
								<td width="72" valign="top" style="padding-right:12px;">
									${imageCell}
								</td>
								<td valign="middle" style="font-size:14px;color:#111827;">
									<div style="font-weight:600;line-height:1.35;">${name}</div>
									<div style="color:#6b7280;font-size:12px;margin-top:6px;">
										<span style="display:inline-block;background:#ecfdf5;color:#047857;font-weight:700;padding:2px 8px;border-radius:999px;margin-right:6px;">
											Qty ${qty}
										</span>
										<span>₹${price} each</span>
									</div>
									${
										[item.size && `Size: ${escapeHtml(item.size)}`, item.color && `Color: ${escapeHtml(item.color)}`, item.style && `Style: ${escapeHtml(item.style)}`]
											.filter(Boolean)
											.length
											? `<div style="color:#6b7280;font-size:12px;margin-top:4px;">${[
													item.size && `Size: ${escapeHtml(item.size)}`,
													item.color && `Color: ${escapeHtml(item.color)}`,
													item.style && `Style: ${escapeHtml(item.style)}`,
											  ]
													.filter(Boolean)
													.join(" · ")}</div>`
											: ""
									}
								</td>
								<td align="right" valign="middle" style="font-size:14px;color:#111827;font-weight:700;white-space:nowrap;padding-left:8px;">
									₹${lineTotal}
								</td>
							</tr>
						</table>
					</td>
				</tr>
			`;
		})
		.join("");

	return `
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
			<tr>
				<td style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;padding-bottom:4px;border-bottom:1px solid #e5e7eb;">
					Items
				</td>
			</tr>
			${rows}
		</table>
	`;
};

const buildOrderEmailHtml = ({
	customerName,
	orderId,
	total,
	event,
	shippingAddress,
	products,
	ordersUrl,
}) => {
	const meta = EVENT_META[event] || EVENT_META.placed;
	const addressLines = formatAddressLines(shippingAddress)
		.map((line) => escapeHtml(line))
		.join("<br/>");
	const safeName = escapeHtml(customerName || "there");
	const year = new Date().getFullYear();

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>${escapeHtml(meta.title)}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
	<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 12px;">
		<tr>
			<td align="center">
				<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
					<tr>
						<td style="background:#059669;padding:28px 28px 24px;">
							<div style="color:#a7f3d0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">
								E-Commerce Store
							</div>
							<h1 style="margin:10px 0 0;color:#ffffff;font-size:24px;line-height:1.3;font-weight:700;">
								${escapeHtml(meta.title)}
							</h1>
						</td>
					</tr>
					<tr>
						<td style="padding:28px;">
							<div style="display:inline-block;background:${meta.badgeBg};color:${meta.badgeText};font-size:12px;font-weight:700;padding:6px 12px;border-radius:999px;margin-bottom:16px;">
								${escapeHtml(meta.eyebrow)} · #${escapeHtml(orderId)}
							</div>
							<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
								Hi ${safeName},
							</p>
							<p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
								${meta.message(escapeHtml(orderId), escapeHtml(total))}
							</p>

							<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:20px;">
								<tr>
									<td style="padding:16px 18px;">
										<div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;margin-bottom:8px;">
											Order summary
										</div>
										<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
											<tr>
												<td style="font-size:14px;color:#6b7280;padding:4px 0;">Order ID</td>
												<td align="right" style="font-size:14px;color:#111827;font-weight:600;padding:4px 0;">#${escapeHtml(orderId)}</td>
											</tr>
											<tr>
												<td style="font-size:14px;color:#6b7280;padding:4px 0;">Total</td>
												<td align="right" style="font-size:18px;color:${meta.accent};font-weight:700;padding:4px 0;">₹${escapeHtml(total)}</td>
											</tr>
										</table>
										${buildProductRows(products)}
									</td>
								</tr>
							</table>

							${
								addressLines
									? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:24px;">
								<tr>
									<td style="padding:16px 18px;">
										<div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;margin-bottom:8px;">
											Shipping address
										</div>
										<div style="font-size:14px;color:#111827;line-height:1.6;">
											${addressLines}
										</div>
									</td>
								</tr>
							</table>`
									: ""
							}

							${
								ordersUrl
									? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
								<tr>
									<td align="center" style="border-radius:10px;background:${meta.accent};">
										<a href="${escapeAttr(ordersUrl)}" style="display:inline-block;padding:12px 22px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
											View your orders
										</a>
									</td>
								</tr>
							</table>`
									: ""
							}
						</td>
					</tr>
					<tr>
						<td style="padding:18px 28px 28px;border-top:1px solid #e5e7eb;text-align:center;">
							<p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
								You're receiving this because you placed an order on our store.<br/>
								© ${year} E-Commerce Store
							</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>`;
};

export const sendVerificationEmail = async ({ to, name, verifyUrl }) => {
	const safeName = escapeHtml(name || "there");
	const safeUrl = escapeAttr(verifyUrl);
	await sendEmail({
		to,
		subject: "Verify your NOVA account",
		text: `Hi ${name || "there"},\n\nConfirm your email by opening this link:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
		html: `<p>Hi ${safeName},</p><p>Confirm your email to finish creating your NOVA account.</p><p><a href="${safeUrl}">Verify email</a></p><p>This link expires in 24 hours.</p>`,
	});
};

export const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
	const safeName = escapeHtml(name || "there");
	const safeUrl = escapeAttr(resetUrl);
	await sendEmail({
		to,
		subject: "Reset your NOVA password",
		text: `Hi ${name || "there"},\n\nReset your password using this link:\n${resetUrl}\n\nIf you did not request this, you can ignore this email. The link expires in 1 hour.`,
		html: `<p>Hi ${safeName},</p><p>We received a request to reset your password.</p><p><a href="${safeUrl}">Reset password</a></p><p>If you did not request this, ignore this email. The link expires in 1 hour.</p>`,
	});
};

export const sendEmail = async ({ to, subject, text, html, attachments = [] }) => {
	const mail = { from: mailFrom(), to, subject, text, html, attachments };

	if (!isEmailConfigured()) {
		console.warn("[email] no email provider configured", { to, subject });
		console.log("[email:dev]", { to, subject, text });
		return {
			ok: false,
			mocked: true,
			error:
				"No email provider. Render blocks Gmail SMTP — add RESEND_API_KEY, SENDGRID_API_KEY, or BREVO_API_KEY.",
		};
	}

	const httpsAttempts = [sendViaResend, sendViaSendGrid, sendViaBrevo, sendViaWebhook];
	let lastHttpsError = "";
	let triedHttps = false;
	for (const sendHttps of httpsAttempts) {
		try {
			const result = await sendHttps(mail);
			if (!result) continue;
			triedHttps = true;
			if (result.ok) {
				console.log("[email] sent", { to, subject, via: result.via });
				return result;
			}
			lastHttpsError = result.error || lastHttpsError;
			console.error("[email] https provider failed", result.error);
		} catch (error) {
			triedHttps = true;
			lastHttpsError = error.message;
			console.error("[email] https provider error", error.message);
		}
	}

	if (
		triedHttps && envVal("RESEND_API_KEY") ||
		process.env.RENDER ||
		process.env.NODE_ENV === "production"
	) {
		return {
			ok: false,
			mocked: false,
			error:
				lastHttpsError ||
				"Email not sent. On Render use Resend (HTTPS). Gmail SMTP is blocked (ENETUNREACH/timeout). Check Resend → Logs. Testing mode only sends to your Resend signup email (e.g. nehaazhar9@gmail.com), not a similar address.",
		};
	}

	if (!isSmtpConfigured()) {
		return {
			ok: false,
			mocked: false,
			error:
				lastHttpsError ||
				"HTTPS email failed and SMTP is not set. Add RESEND_API_KEY (recommended on Render).",
		};
	}

	const trySend = async (payload) => {
		const isGmail =
			/gmail\.com/i.test(envVal("SMTP_HOST")) || /gmail\.com/i.test(envVal("SMTP_USER"));
		const ports = isGmail
			? [587, 465]
			: [Number(envVal("SMTP_PORT") || 587), 465, 587];
		const uniquePorts = [...new Set(ports.filter(Boolean))];
		let lastError = null;

		for (const port of uniquePorts) {
			try {
				const transport = createSmtpTransport(port);
				const info = await transport.sendMail(payload);
				transporter = transport;
				console.log("[email] sent", { to, subject, id: info.messageId, port });
				return { ok: true, mocked: false, via: "smtp" };
			} catch (error) {
				lastError = error;
				console.error("[email] send attempt failed", {
					port,
					code: error.code,
					command: error.command,
					message: error.message,
				});
			}
		}

		throw lastError || new Error("Email send failed");
	};

	try {
		return await trySend(mail);
	} catch (error) {
		if (attachments?.length) {
			console.warn("[email] retrying without attachments");
			try {
				return await trySend({ ...mail, attachments: [] });
			} catch (retryError) {
				console.error("[email] send failed:", retryError.message);
				return {
					ok: false,
					mocked: false,
					error: `${retryError.message}. Render often blocks Gmail SMTP — use Resend/SendGrid/Brevo API key.`,
				};
			}
		}
		console.error("[email] send failed:", error.message);
		return {
			ok: false,
			mocked: false,
			error: `${error.message}. Render often blocks Gmail SMTP — use Resend/SendGrid/Brevo API key.`,
		};
	}
};

export const sendOrderEmail = async (order, event) => {
	try {
		let email = typeof order.user === "object" ? order.user.email : null;
		let customerName = typeof order.user === "object" ? order.user.name : "there";
		if (!email) {
			const uid = order.user?._id || order.user;
			if (uid) {
				const account = await User.findById(uid).select("name email");
				email = account?.email || null;
				customerName = account?.name || customerName;
			}
		}
		if (!email) {
			console.warn("[email] skip order mail — no customer email on order", event);
			return;
		}

		const orderId = order._id?.toString()?.slice(-8)?.toUpperCase() || "ORDER";
		const total = Number(order.totalAmount || 0).toFixed(2);
		const addressLines = formatAddressLines(order.shippingAddress);
		const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
		const ordersUrl = `${clientUrl}/orders`;

		const productsForEmail = await hydrateOrderProducts(order.products || []);

		const subjects = {
			placed: `Order confirmed #${orderId}`,
			processing: `Order processing #${orderId}`,
			shipped: `Order shipped #${orderId}`,
			delivered: `Order delivered #${orderId}`,
			cancelled: `Order cancelled #${orderId}`,
			return_requested: `Return requested #${orderId}`,
			return_approved: `Return approved #${orderId}`,
			return_rejected: `Return rejected #${orderId}`,
		};

		const plainMessages = {
			placed: `Your order #${orderId} has been placed successfully. Total: ₹${total}`,
			processing: `Your order #${orderId} is being processed.`,
			shipped: `Good news! Your order #${orderId} is on the way.`,
			delivered: `Your order #${orderId} has been delivered. Enjoy your purchase!`,
			cancelled: `Your order #${orderId} has been cancelled. If payment was taken, refund will be processed as per policy.`,
			return_requested: `We received your return request for order #${orderId}.`,
			return_approved: `Your return for order #${orderId} was approved. Stock has been restored.`,
			return_rejected: `Your return for order #${orderId} was rejected.`,
		};

		const subject = subjects[event] || `Order update #${orderId}`;
		const productLines = productsForEmail
			.map((item) => {
				const name = item.product?.name || "Product";
				const qty = Number(item.quantity || 1);
				const price = Number(item.price || 0).toFixed(2);
				const opts = [item.size && `Size ${item.size}`, item.color && `Color ${item.color}`, item.style && `Style ${item.style}`]
					.filter(Boolean)
					.join(", ");
				return `- ${name} × ${qty} (₹${price} each)${opts ? ` [${opts}]` : ""}`;
			})
			.join("\n");

		const text = `Hi ${customerName},

${plainMessages[event] || "Your order was updated."}

Order ID: #${orderId}
Total: ₹${total}

Items:
${productLines || "N/A"}

Shipping address:
${addressLines.length ? addressLines.join("\n") : "N/A"}

View orders: ${ordersUrl}

Thank you for shopping with us.`;

		const html = buildOrderEmailHtml({
			customerName,
			orderId,
			total,
			event,
			shippingAddress: order.shippingAddress,
			products: productsForEmail,
			ordersUrl,
		});

		const result = await sendEmail({ to: email, subject, text, html });
		if (!result.ok) {
			console.error("[email] order mail not delivered", { to: email, event, error: result.error });
		}
	} catch (error) {
		console.error("sendOrderEmail failed:", error.message);
	}
};
