import Review from "../models/review.model.js";
import Product from "../models/product.model.js";
import cloudinary from "../lib/cloudinary.js";

const MAX_REVIEW_IMAGES = 5;

const refreshProductRating = async (productId) => {
	const stats = await Review.aggregate([
		{ $match: { product: productId } },
		{
			$group: {
				_id: "$product",
				averageRating: { $avg: "$rating" },
				numReviews: { $sum: 1 },
			},
		},
	]);

	const averageRating = stats[0]
		? Math.round(stats[0].averageRating * 10) / 10
		: 0;
	const numReviews = stats[0]?.numReviews || 0;

	await Product.findByIdAndUpdate(productId, { averageRating, numReviews });
	return { averageRating, numReviews };
};

const getPublicIdFromUrl = (imageUrl) => {
	const parts = imageUrl.split("/");
	return parts.at(-1)?.split(".")[0];
};

const deleteCloudinaryImages = async (urls = []) => {
	for (const imageUrl of urls) {
		if (!imageUrl?.includes("res.cloudinary.com")) continue;
		try {
			const publicId = getPublicIdFromUrl(imageUrl);
			if (publicId) {
				await cloudinary.uploader.destroy(`reviews/${publicId}`);
			}
		} catch (error) {
			console.log("error deleting review image from cloudinary", error.message);
		}
	}
};

const resolveReviewImages = async (imageSources = [], previousImages = []) => {
	if (!Array.isArray(imageSources)) {
		return previousImages || [];
	}

	if (imageSources.length > MAX_REVIEW_IMAGES) {
		throw Object.assign(new Error(`Maximum ${MAX_REVIEW_IMAGES} images allowed`), {
			statusCode: 400,
		});
	}

	const resolved = [];
	for (const imageSrc of imageSources) {
		if (typeof imageSrc !== "string" || !imageSrc.trim()) continue;

		if (imageSrc.startsWith("http://") || imageSrc.startsWith("https://")) {
			resolved.push(imageSrc);
			continue;
		}

		const uploadResponse = await cloudinary.uploader.upload(imageSrc, {
			folder: "reviews",
		});
		resolved.push(uploadResponse.secure_url);
	}

	const removed = (previousImages || []).filter(
		(oldUrl) =>
			oldUrl.includes("res.cloudinary.com") && !resolved.includes(oldUrl)
	);
	await deleteCloudinaryImages(removed);

	return resolved;
};

export const getProductReviews = async (req, res) => {
	try {
		const reviews = await Review.find({ product: req.params.productId })
			.populate("user", "name")
			.sort({ createdAt: -1 });
		res.json({ reviews });
	} catch (error) {
		console.log("Error in getProductReviews", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const createReview = async (req, res) => {
	try {
		const { rating, comment, images } = req.body;
		const productId = req.params.productId;

		if (!rating || !comment?.trim()) {
			return res.status(400).json({ message: "Rating and comment are required" });
		}

		const numericRating = Number(rating);
		if (numericRating < 1 || numericRating > 5) {
			return res.status(400).json({ message: "Rating must be between 1 and 5" });
		}

		const product = await Product.findById(productId);
		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}

		const existing = await Review.findOne({
			product: productId,
			user: req.user._id,
		});
		if (existing) {
			return res.status(400).json({
				message:
					"You have already reviewed this product. You can update your review instead.",
			});
		}

		const resolvedImages = await resolveReviewImages(images || [], []);

		const review = await Review.create({
			product: productId,
			user: req.user._id,
			rating: numericRating,
			comment: comment.trim(),
			images: resolvedImages,
		});

		const ratingData = await refreshProductRating(product._id);
		await review.populate("user", "name");

		res.status(201).json({ review, ...ratingData });
	} catch (error) {
		if (error.statusCode === 400) {
			return res.status(400).json({ message: error.message });
		}
		if (error.code === 11000) {
			return res
				.status(400)
				.json({ message: "You have already reviewed this product" });
		}
		console.log("Error in createReview", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const updateReview = async (req, res) => {
	try {
		const { rating, comment, images } = req.body;
		const review = await Review.findById(req.params.reviewId);
		if (!review) {
			return res.status(404).json({ message: "Review not found" });
		}

		if (review.user.toString() !== req.user._id.toString()) {
			return res.status(403).json({ message: "Not authorized to update this review" });
		}

		if (rating !== undefined) {
			const numericRating = Number(rating);
			if (numericRating < 1 || numericRating > 5) {
				return res.status(400).json({ message: "Rating must be between 1 and 5" });
			}
			review.rating = numericRating;
		}
		if (comment !== undefined) {
			if (!String(comment).trim()) {
				return res.status(400).json({ message: "Comment cannot be empty" });
			}
			review.comment = String(comment).trim();
		}
		if (images !== undefined) {
			review.images = await resolveReviewImages(images, review.images || []);
		}

		await review.save();
		const ratingData = await refreshProductRating(review.product);
		await review.populate("user", "name");

		res.json({ review, ...ratingData });
	} catch (error) {
		if (error.statusCode === 400) {
			return res.status(400).json({ message: error.message });
		}
		console.log("Error in updateReview", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const deleteReview = async (req, res) => {
	try {
		const review = await Review.findById(req.params.reviewId);
		if (!review) {
			return res.status(404).json({ message: "Review not found" });
		}

		const isOwner = review.user.toString() === req.user._id.toString();
		const isAdmin = req.user.role === "admin";
		if (!isOwner && !isAdmin) {
			return res.status(403).json({ message: "Not authorized to delete this review" });
		}

		const productId = review.product;
		await deleteCloudinaryImages(review.images || []);
		await review.deleteOne();
		const ratingData = await refreshProductRating(productId);

		res.json({ message: "Review deleted", ...ratingData });
	} catch (error) {
		console.log("Error in deleteReview", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
