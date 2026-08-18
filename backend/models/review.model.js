import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		product: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Product",
			required: true,
		},
		rating: {
			type: Number,
			required: true,
			min: 1,
			max: 5,
		},
		comment: {
			type: String,
			required: true,
			trim: true,
			maxlength: 1000,
		},
		images: {
			type: [String],
			default: [],
			validate: {
				validator: (arr) => Array.isArray(arr) && arr.length <= 5,
				message: "Maximum 5 images allowed per review",
			},
		},
	},
	{ timestamps: true }
);

reviewSchema.index({ product: 1, user: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);

export default Review;
