import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
	{
		size: { type: String, default: "" },
		color: { type: String, default: "" },
		stock: { type: Number, min: 0, default: 0 },
	},
	{ _id: false }
);

const productSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
		},
		description: {
			type: String,
			required: true,
		},
		price: {
			type: Number,
			min: 0,
			required: true,
		},
		images: {
			type: [String],
			required: [true, "At least one image is required"],
			validate: {
				validator: (arr) => Array.isArray(arr) && arr.length > 0,
				message: "At least one image is required",
			},
		},
		category: {
			type: String,
			required: true,
		},
		stock: {
			type: Number,
			required: true,
			min: 0,
			default: 0,
		},
		sizes: {
			type: [String],
			default: [],
		},
		colors: {
			type: [String],
			default: [],
		},
		styles: {
			type: [String],
			default: [],
		},
		variants: {
			type: [variantSchema],
			default: [],
		},
		averageRating: {
			type: Number,
			default: 0,
			min: 0,
			max: 5,
		},
		numReviews: {
			type: Number,
			default: 0,
			min: 0,
		},
		isFeatured: {
			type: Boolean,
			default: false,
		},
	},
	{ timestamps: true }
);

productSchema.index({ name: "text", description: "text" });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ stock: 1 });

const Product = mongoose.model("Product", productSchema);

export default Product;
