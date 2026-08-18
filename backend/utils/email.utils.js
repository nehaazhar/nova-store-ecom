import nodemailer from "nodemailer";
import Product from "../models/product.model.js";

export const isSmtpConfigured = () => {
	const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
	return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
};

let transporter = null;

const getTransporter = () => {
	if (transporter) return transporter;

	const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
	if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
		return null;
	}

	transporter = nodemailer.createTransport({
		host: SMTP_HOST,
		port: Number(SMTP_PORT || 587),
		secure: Number(SMTP_PORT) === 465,
		auth: {
			user: SMTP_USER,
			pass: SMTP_PASS,
		},
	});

	return transporter;
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
	const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@ecommerce.local";
	const mail = { from, to, subject, text, html, attachments };

	const transport = getTransporter();
	if (!transport) {
		console.log("[email:dev]", {
			to,
			subject,
			text,
			attachments: attachments.map((a) => a.filename),
			htmlHasImages: /<img[\s\S]*src=/.test(html || ""),
		});
		return { ok: true, mocked: true };
	}

	await transport.sendMail(mail);
	return { ok: true, mocked: false };
};

export const sendOrderEmail = async (order, event) => {
	try {
		const user = order.user;
		const email = typeof user === "object" ? user.email : null;
		if (!email) return;

		const orderId = order._id?.toString()?.slice(-8)?.toUpperCase() || "ORDER";
		const total = Number(order.totalAmount || 0).toFixed(2);
		const customerName = typeof user === "object" ? user.name : "there";
		const addressLines = formatAddressLines(order.shippingAddress);
		const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
		const ordersUrl = `${clientUrl}/orders`;

		const hydrated = await hydrateOrderProducts(order.products || []);
		const attachments = [];
		const productsForEmail = [];

		for (let i = 0; i < hydrated.length; i++) {
			const item = hydrated[i];
			const attachment = await fetchImageAttachment(item.product?.imageUrl, i);
			if (attachment) {
				attachments.push(attachment);
				attachments.push({
					filename: `${(item.product?.name || "product").replace(/[^\w.-]+/g, "_").slice(0, 40)}.jpg`,
					content: Buffer.from(attachment.content),
					contentType: attachment.contentType || "image/jpeg",
				});
				productsForEmail.push({ ...item, cid: attachment.cid });
				console.log(`[email] inline image ready: ${attachment.cid} (${attachment.content.length} bytes)`);
			} else {
				productsForEmail.push(item);
				console.log(`[email] no image for product: ${item.product?.name || i}`);
			}
		}

		const subjects = {
			placed: `Order confirmed #${orderId}`,
			shipped: `Order shipped #${orderId}`,
			delivered: `Order delivered #${orderId}`,
			cancelled: `Order cancelled #${orderId}`,
			return_requested: `Return requested #${orderId}`,
			return_approved: `Return approved #${orderId}`,
			return_rejected: `Return rejected #${orderId}`,
		};

		const plainMessages = {
			placed: `Your order #${orderId} has been placed successfully. Total: ₹${total}`,
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

		await sendEmail({ to: email, subject, text, html, attachments });
	} catch (error) {
		console.log("sendOrderEmail failed:", error.message);
	}
};
