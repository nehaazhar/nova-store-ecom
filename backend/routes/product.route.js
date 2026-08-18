import express from "express";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getCategories,
  getFeaturedProducts,
  getProductById,
  getProductCatalog,
  getProductsByCategory,
  getRecommendedProducts,
  getSearchSuggestions,
  seedFullCatalog,
  toggleFeaturedProduct,
  updateProduct,
} from "../controllers/product.controller.js";
import { adminRoute, protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protectRoute, adminRoute, getAllProducts);
router.get("/catalog", getProductCatalog);
router.get("/search-suggest", getSearchSuggestions);
router.get("/categories", getCategories);
router.get("/featured", getFeaturedProducts);
router.get("/category/:category", getProductsByCategory);
router.get("/recommendations", getRecommendedProducts);
router.get("/:id", getProductById);
router.post("/", protectRoute, adminRoute, createProduct);
router.post("/seed-catalog", protectRoute, adminRoute, seedFullCatalog);
router.put("/:id", protectRoute, adminRoute, updateProduct);
router.patch("/:id", protectRoute, adminRoute, toggleFeaturedProduct);
router.delete("/:id", protectRoute, adminRoute, deleteProduct);

export default router;
