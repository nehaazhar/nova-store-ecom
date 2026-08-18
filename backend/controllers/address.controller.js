import { mapNominatimToAddress, parseCoordinates } from "../utils/geocode.utils.js";

const requiredFields = ["fullName", "phone", "line1", "city", "state", "postalCode", "country"];
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

export const normalizeAddress = (input = {}) => {
	const address = {
		fullName: String(input.fullName || "").trim(),
		phone: String(input.phone || "").trim(),
		line1: String(input.line1 || "").trim(),
		line2: String(input.line2 || "").trim(),
		city: String(input.city || "").trim(),
		state: String(input.state || "").trim(),
		postalCode: String(input.postalCode || "").trim(),
		country: String(input.country || "India").trim() || "India",
		isDefault: Boolean(input.isDefault),
	};

	for (const field of requiredFields) {
		if (!address[field]) {
			return { ok: false, message: `${field} is required` };
		}
	}

	return { ok: true, address };
};

export const reverseGeocodeAddress = async (req, res) => {
	try {
		const parsed = parseCoordinates(req.body);
		if (!parsed.ok) {
			return res.status(400).json({ message: parsed.message });
		}

		const url = `${NOMINATIM_URL}?lat=${encodeURIComponent(parsed.latitude)}&lon=${encodeURIComponent(
			parsed.longitude
		)}&format=json&addressdetails=1`;

		const response = await fetch(url, {
			headers: {
				Accept: "application/json",
				"Accept-Language": "en",
				"User-Agent": "NOVA-store",
			},
		});

		if (!response.ok) {
			return res.status(502).json({ message: "Location lookup failed. Please enter the address manually." });
		}

		const result = await response.json();
		const mapped = mapNominatimToAddress(result);
		if (!mapped.ok) {
			return res.status(422).json({ message: mapped.message });
		}

		res.json({
			address: mapped.address,
			incomplete: mapped.incomplete,
			latitude: parsed.latitude,
			longitude: parsed.longitude,
		});
	} catch (error) {
		console.log("Error in reverseGeocodeAddress", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const getAddresses = async (req, res) => {
	try {
		res.json({ addresses: req.user.addresses || [] });
	} catch (error) {
		console.log("Error in getAddresses", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const addAddress = async (req, res) => {
	try {
		const parsed = normalizeAddress(req.body);
		if (!parsed.ok) {
			return res.status(400).json({ message: parsed.message });
		}

		if (!req.user.addresses) req.user.addresses = [];

		if (parsed.address.isDefault || req.user.addresses.length === 0) {
			req.user.addresses.forEach((a) => {
				a.isDefault = false;
			});
			parsed.address.isDefault = true;
		}

		req.user.addresses.push(parsed.address);
		await req.user.save();

		res.status(201).json({
			message: "Address added",
			addresses: req.user.addresses,
		});
	} catch (error) {
		console.log("Error in addAddress", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const updateAddress = async (req, res) => {
	try {
		const address = req.user.addresses?.id(req.params.addressId);
		if (!address) {
			return res.status(404).json({ message: "Address not found" });
		}

		const parsed = normalizeAddress({ ...address.toObject(), ...req.body });
		if (!parsed.ok) {
			return res.status(400).json({ message: parsed.message });
		}

		Object.assign(address, parsed.address);

		if (parsed.address.isDefault) {
			req.user.addresses.forEach((a) => {
				a.isDefault = a._id.toString() === address._id.toString();
			});
		}

		await req.user.save();
		res.json({ message: "Address updated", addresses: req.user.addresses });
	} catch (error) {
		console.log("Error in updateAddress", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const deleteAddress = async (req, res) => {
	try {
		const address = req.user.addresses?.id(req.params.addressId);
		if (!address) {
			return res.status(404).json({ message: "Address not found" });
		}

		const wasDefault = address.isDefault;
		address.deleteOne();

		if (wasDefault && req.user.addresses.length > 0) {
			req.user.addresses[0].isDefault = true;
		}

		await req.user.save();
		res.json({ message: "Address deleted", addresses: req.user.addresses });
	} catch (error) {
		console.log("Error in deleteAddress", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const setDefaultAddress = async (req, res) => {
	try {
		const address = req.user.addresses?.id(req.params.addressId);
		if (!address) {
			return res.status(404).json({ message: "Address not found" });
		}

		req.user.addresses.forEach((a) => {
			a.isDefault = a._id.toString() === address._id.toString();
		});
		await req.user.save();

		res.json({ message: "Default address updated", addresses: req.user.addresses });
	} catch (error) {
		console.log("Error in setDefaultAddress", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
