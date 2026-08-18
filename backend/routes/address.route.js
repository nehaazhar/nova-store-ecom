import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
	addAddress,
	deleteAddress,
	getAddresses,
	reverseGeocodeAddress,
	setDefaultAddress,
	updateAddress,
} from "../controllers/address.controller.js";

const router = express.Router();

router.get("/", protectRoute, getAddresses);
router.post("/from-location", protectRoute, reverseGeocodeAddress);
router.post("/", protectRoute, addAddress);
router.put("/:addressId", protectRoute, updateAddress);
router.put("/:addressId/default", protectRoute, setDefaultAddress);
router.delete("/:addressId", protectRoute, deleteAddress);

export default router;
