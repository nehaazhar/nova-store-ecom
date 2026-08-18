import { redis } from "../lib/redis.js";
import cloudinary from "../lib/cloudinary.js";
import Product from "../models/product.model.js";
import {
  buildVariantsFromOptions,
  normalizeIncomingVariants,
  syncOptionListsFromVariants,
  totalVariantStock,
} from "../utils/variant.utils.js";
import {
  buildCatalogMongoQuery,
  bumpCatalogCache,
  catalogCacheKey,
  catalogCacheVersionKey,
  escapeRegex,
} from "../utils/catalog.utils.js";

const normalizeOptions = (arr) =>
  Array.isArray(arr)
    ? [...new Set(arr.map((v) => String(v).trim()).filter(Boolean))]
    : [];

const resolveProductVariants = ({ sizes, colors, styles, variants, stock }) => {
  const sizeList = normalizeOptions(sizes);
  const colorList = normalizeOptions(colors);
  const styleList = normalizeOptions(styles);
  const stockValue =
    stock === undefined || stock === "" || stock === null ? 10 : Number(stock);

  let resolvedVariants;
  if (Array.isArray(variants) && variants.length > 0) {
    resolvedVariants = normalizeIncomingVariants(variants);
  } else {
    resolvedVariants = buildVariantsFromOptions(
      sizeList,
      colorList,
      Number.isNaN(stockValue) ? 10 : Math.max(0, stockValue),
      []
    );
  }

  const lists = syncOptionListsFromVariants(resolvedVariants, styleList);
  return {
    variants: resolvedVariants,
    sizes: lists.sizes.length ? lists.sizes : sizeList,
    colors: lists.colors.length ? lists.colors : colorList,
    styles: lists.styles.length ? lists.styles : styleList,
    stock: totalVariantStock(resolvedVariants),
  };
};

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({}); // find all products
    res.json({ products });
  } catch (error) {
    console.log("Error in getAllProducts controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getFeaturedProducts = async (req, res) => {
  try {
    let featuredProducts = await redis.get("featured_products");
    if (featuredProducts) {
      return res.json(JSON.parse(featuredProducts));
    }

    // if not in redis, fetch from mongodb
    // .lean() is gonna return a plain javascript object instead of a mongodb document
    // which is good for performance
    featuredProducts = await Product.find({ isFeatured: true }).lean();

    if (!featuredProducts) {
      return res.status(404).json({ message: "No featured products found" });
    }

    // store in redis for future quick access

    await redis.set("featured_products", JSON.stringify(featuredProducts));

    res.json(featuredProducts);
  } catch (error) {
    console.log("Error in getFeaturedProducts controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      image,
      images,
      category,
      stock,
      sizes,
      colors,
      styles,
      variants,
    } = req.body;

    if (!category || !String(category).trim()) {
      return res.status(400).json({ message: "Category is required" });
    }

    const normalizedCategory = String(category).trim().toLowerCase();
    const variantData = resolveProductVariants({
      sizes,
      colors,
      styles,
      variants,
      stock,
    });

    const imageSources =
      Array.isArray(images) && images.length > 0
        ? images
        : image
          ? [image]
          : [];

    const uploadedImages = [];
    for (const imageSrc of imageSources) {
      if (typeof imageSrc === "string" && (imageSrc.startsWith("http://") || imageSrc.startsWith("https://"))) {
        uploadedImages.push(imageSrc);
        continue;
      }
      const cloudinaryResponse = await cloudinary.uploader.upload(imageSrc, {
        folder: "products",
      });
      uploadedImages.push(cloudinaryResponse.secure_url);
    }

    if (uploadedImages.length === 0) {
      return res.status(400).json({ message: "At least one product image is required" });
    }

    const product = await Product.create({
      name,
      description,
      price,
      images: uploadedImages,
      category: normalizedCategory,
      ...variantData,
    });

    await bumpCatalogCache(redis);
    res.status(201).json(product);
  } catch (error) {
    console.log("Error in createProduct controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.images?.length) {
      for (const imageUrl of product.images) {
        const publicId = imageUrl.split("/").pop().split(".")[0];
        try {
          await cloudinary.uploader.destroy(`products/${publicId}`);
        } catch (error) {
          console.log("error deleting image from cloudinary", error);
        }
      }
    }

    await Product.findByIdAndDelete(req.params.id);
    await bumpCatalogCache(redis);

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.log("Error in deleteProduct controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getRecommendedProducts = async (req, res) => {
  try {
    const products = await Product.aggregate([
      {
        $sample: { size: 4 },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          images: 1,
          price: 1,
        },
      },
    ]);

    res.json(products);
  } catch (error) {
    console.log("Error in getRecommendedProducts controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    console.log("Error in getProductById controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await Product.aggregate([
      {
        $match: {
          category: { $exists: true, $nin: [null, ""] },
        },
      },
      {
        $group: {
          _id: { $toLower: { $trim: { input: "$category" } } },
          productCount: { $sum: 1 },
          image: { $first: { $arrayElemAt: ["$images", 0] } },
          sampleImages: { $push: { $arrayElemAt: ["$images", 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          slug: "$_id",
          productCount: 1,
          image: {
            $ifNull: [
              "$image",
              { $arrayElemAt: ["$sampleImages", 0] },
            ],
          },
        },
      },
      { $sort: { name: 1 } },
    ]);

    const formatted = categories.map((cat) => ({
      ...cat,
      label: cat.name
        .split(/[\s-]+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
      href: `/${encodeURIComponent(cat.slug)}`,
      imageUrl: cat.image || null,
    }));

    res.json({ categories: formatted });
  } catch (error) {
    console.log("Error in getCategories controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getProductsByCategory = async (req, res) => {
  const { category } = req.params;
  try {
    const normalized = decodeURIComponent(category).trim().toLowerCase();
    const products = await Product.find({
      category: { $regex: `^${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });
    res.json({ products });
  } catch (error) {
    console.log("Error in getProductsByCategory controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getProductCatalog = async (req, res) => {
  try {
    const {
      search = "",
      category = "",
      minPrice,
      maxPrice,
      sort = "newest",
      page = 1,
      limit = 12,
    } = req.query;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(48, Math.max(1, Number(limit) || 12));
    const skip = (pageNum - 1) * limitNum;

    const cacheParams = {
      search,
      category,
      minPrice: minPrice ?? "",
      maxPrice: maxPrice ?? "",
      sort,
      page: pageNum,
      limit: limitNum,
    };

    try {
      const version = (await redis.get(catalogCacheVersionKey)) || "0";
      const cached = await redis.get(catalogCacheKey(version, cacheParams));
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    } catch (cacheError) {
      console.log("Catalog cache read skipped:", cacheError.message);
    }

    const { filter, sortOption } = buildCatalogMongoQuery({
      search,
      category,
      minPrice,
      maxPrice,
      sort,
    });

    const [products, total, categories, priceStats] = await Promise.all([
      Product.find(filter).sort(sortOption).skip(skip).limit(limitNum),
      Product.countDocuments(filter),
      Product.distinct("category"),
      Product.aggregate([
        { $group: { _id: null, minPrice: { $min: "$price" }, maxPrice: { $max: "$price" } } },
      ]),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limitNum));

    const payload = {
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      filters: {
        search,
        category: category || "all",
        minPrice: minPrice ?? "",
        maxPrice: maxPrice ?? "",
        sort,
        availableCategories: categories.sort(),
        priceRange: {
          min: priceStats[0]?.minPrice ?? 0,
          max: priceStats[0]?.maxPrice ?? 0,
        },
      },
    };

    try {
      const version = (await redis.get(catalogCacheVersionKey)) || "0";
      await redis.set(
        catalogCacheKey(version, cacheParams),
        JSON.stringify(payload),
        "EX",
        60
      );
    } catch (cacheError) {
      console.log("Catalog cache write skipped:", cacheError.message);
    }

    res.json(payload);
  } catch (error) {
    console.log("Error in getProductCatalog controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getSearchSuggestions = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) {
      return res.json({ suggestions: [] });
    }

    const rx = new RegExp(escapeRegex(q), "i");
    const products = await Product.find({
      $or: [{ name: rx }, { category: rx }],
    })
      .select("name category images price")
      .limit(8)
      .lean();

    res.json({
      suggestions: products.map((p) => ({
        _id: p._id,
        name: p.name,
        category: p.category,
        image: p.images?.[0] || "",
        price: p.price,
      })),
    });
  } catch (error) {
    console.log("Error in getSearchSuggestions", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { name, description, price, image, images, category, isFeatured, stock, sizes, colors, styles, variants } =
      req.body;
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (Array.isArray(images)) {
      if (images.length === 0) {
        return res.status(400).json({ message: "At least one product image is required" });
      }

      const resolvedImages = [];
      for (const imageSrc of images) {
        if (typeof imageSrc !== "string" || !imageSrc.trim()) continue;

        if (imageSrc.startsWith("http://") || imageSrc.startsWith("https://")) {
          resolvedImages.push(imageSrc);
          continue;
        }

        // New upload (base64 / data URL)
        const uploadResponse = await cloudinary.uploader.upload(imageSrc, {
          folder: "products",
        });
        resolvedImages.push(uploadResponse.secure_url);
      }

      if (resolvedImages.length === 0) {
        return res.status(400).json({ message: "At least one product image is required" });
      }

      // Delete removed Cloudinary images (keep remote/seed URLs untouched)
      const removed = (product.images || []).filter(
        (oldUrl) =>
          oldUrl.includes("res.cloudinary.com") && !resolvedImages.includes(oldUrl),
      );
      for (const imageUrl of removed) {
        try {
          const publicId = imageUrl.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`products/${publicId}`);
        } catch (error) {
          console.log("error deleting removed image from cloudinary", error.message);
        }
      }

      product.images = resolvedImages;
    } else if (image) {
      if (product.images?.length) {
        for (const imageUrl of product.images) {
          if (!imageUrl.includes("res.cloudinary.com")) continue;
          try {
            const publicId = imageUrl.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`products/${publicId}`);
          } catch (error) {
            console.log("error deleting old image from cloudinary", error.message);
          }
        }
      }
      const cloudinaryResponse = await cloudinary.uploader.upload(image, {
        folder: "products",
      });
      product.images = [cloudinaryResponse.secure_url];
    }

    product.name = name ?? product.name;
    product.description = description ?? product.description;
    product.price = price ?? product.price;
    if (category !== undefined) {
      const normalizedCategory = String(category || "").trim().toLowerCase();
      if (!normalizedCategory) {
        return res.status(400).json({ message: "Category is required" });
      }
      product.category = normalizedCategory;
    }
    if (stock !== undefined && stock !== null && stock !== "" && variants === undefined && sizes === undefined && colors === undefined && styles === undefined) {
      // Only total stock provided without variant rebuild — distribute later via variants if present
      const stockValue = Number(stock);
      if (Number.isNaN(stockValue) || stockValue < 0) {
        return res.status(400).json({ message: "Stock must be a number of 0 or more" });
      }
      if (product.variants?.length) {
        // ignore lone stock field when variants exist; client should send variants
      } else {
        product.stock = stockValue;
      }
    }

    if (
      variants !== undefined ||
      sizes !== undefined ||
      colors !== undefined ||
      styles !== undefined
    ) {
      const variantData = resolveProductVariants({
        sizes: sizes !== undefined ? sizes : product.sizes,
        colors: colors !== undefined ? colors : product.colors,
        styles: styles !== undefined ? styles : product.styles,
        variants:
          variants !== undefined
            ? variants
            : buildVariantsFromOptions(
                sizes !== undefined ? sizes : product.sizes,
                colors !== undefined ? colors : product.colors,
                stock ?? 10,
                product.variants || []
              ),
        stock: stock ?? 10,
        styles: styles !== undefined ? styles : product.styles,
      });
      product.variants = variantData.variants;
      product.sizes = variantData.sizes;
      product.colors = variantData.colors;
      product.styles = variantData.styles;
      product.stock = variantData.stock;
    }

    if (typeof isFeatured !== "undefined") {
      product.isFeatured = isFeatured;
    }

    const updatedProduct = await product.save();
    await updateFeaturedProductsCache();
    await bumpCatalogCache(redis);
    res.json(updatedProduct);
  } catch (error) {
    console.log("Error in updateProduct controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const toggleFeaturedProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.isFeatured = !product.isFeatured;
    const updatedProduct = await product.save();
    await updateFeaturedProductsCache();
    await bumpCatalogCache(redis);
    res.json(updatedProduct);
  } catch (error) {
    console.log("Error in toggleFeaturedProduct controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

async function updateFeaturedProductsCache() {
  try {
    const featuredProducts = await Product.find({ isFeatured: true }).lean();
    await redis.set("featured_products", JSON.stringify(featuredProducts));
  } catch (error) {
    console.log("error in update cache function", error);
  }
}
