export class HttpError extends Error {
	constructor(statusCode, message) {
		super(message);
		this.statusCode = statusCode;
	}
}

export const asyncHandler = (fn) => (req, res, next) => {
	Promise.resolve(fn(req, res, next)).catch(next);
};

export const notFound = (req, res, next) => {
	next(new HttpError(404, `API route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (err, req, res, next) => {
	if (res.headersSent) {
		return next(err);
	}

	if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
		return res.status(401).json({ message: "Unauthorized" });
	}

	const statusCode = Number(err.statusCode || err.status || 500);
	const safeStatus = statusCode >= 400 && statusCode < 600 ? statusCode : 500;
	const message =
		safeStatus === 500 && process.env.NODE_ENV === "production"
			? "Server error"
			: err.message || "Server error";

	if (safeStatus >= 500) {
		console.error("Unhandled error:", err);
	}

	res.status(safeStatus).json({
		message,
		...(err.code ? { code: err.code } : {}),
	});
};
