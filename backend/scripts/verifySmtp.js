import "../loadEnv.js";
import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST;
const user = process.env.SMTP_USER;
const pass = String(process.env.SMTP_PASS || "")
	.trim()
	.replace(/^['"]|['"]$/g, "");
const port = Number(process.env.SMTP_PORT || 587);

const transport = nodemailer.createTransport({
	host,
	port,
	secure: port === 465,
	auth: { user, pass },
});

try {
	await transport.verify();
	console.log(JSON.stringify({ ok: true, host, port }));
} catch (error) {
	console.log(
		JSON.stringify({
			ok: false,
			code: error.code || null,
			message: error.message,
		})
	);
	process.exitCode = 1;
}
