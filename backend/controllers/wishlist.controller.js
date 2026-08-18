import Product from "../models/product.model.js";

export const getWishlist = async (req, res) => {
	try {
		const user = await req.user.populate({
			path: "wishlist",
			select: "name price images category stock averageRating numReviews isFeatured",
		});
		res.json({ wishlist: user.wishlist || [] });
	} catch (error) {
		console.log("Error in getWishlist", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const addToWishlist = async (req, res) => {
	try {
		const { productId } = req.body;
		if (!productId) {
			return res.status(400).json({ message: "Product ID is required" });
		}

		const product = await Product.findById(productId);
		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}

		const alreadyAdded = req.user.wishlist?.some(
			(id) => id.toString() === productId.toString()
		);
		if (alreadyAdded) {
			return res.status(400).json({ message: "Product already in wishlist" });
		}

		req.user.wishlist.push(productId);
		await req.user.save();

		res.status(201).json({
			message: "Added to wishlist",
			wishlist: req.user.wishlist,
		});
	} catch (error) {
		console.log("Error in addToWishlist", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const removeFromWishlist = async (req, res) => {
	try {
		const { productId } = req.params;
		req.user.wishlist = (req.user.wishlist || []).filter(
			(id) => id.toString() !== productId.toString()
		);
		await req.user.save();
		res.json({ message: "Removed from wishlist", wishlist: req.user.wishlist });
	} catch (error) {
		console.log("Error in removeFromWishlist", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const toggleWishlist = async (req, res) => {
	try {
		const { productId } = req.body;
		if (!productId) {
			return res.status(400).json({ message: "Product ID is required" });
		}

		const product = await Product.findById(productId);
		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}

		const exists = req.user.wishlist?.some(
			(id) => id.toString() === productId.toString()
		);

		if (exists) {
			req.user.wishlist = req.user.wishlist.filter(
				(id) => id.toString() !== productId.toString()
			);
			await req.user.save();
			return res.json({
				message: "Removed from wishlist",
				inWishlist: false,
				wishlist: req.user.wishlist,
			});
		}

		req.user.wishlist.push(productId);
		await req.user.save();
		res.json({
			message: "Added to wishlist",
			inWishlist: true,
			wishlist: req.user.wishlist,
		});
	} catch (error) {
		console.log("Error in toggleWishlist", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
