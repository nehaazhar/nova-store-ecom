export const parseCoordinates = (input = {}) => {
	const latitude = Number(input.latitude ?? input.lat);
	const longitude = Number(input.longitude ?? input.lon ?? input.lng);

	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return { ok: false, message: "Valid latitude and longitude are required" };
	}
	if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
		return { ok: false, message: "Coordinates are out of range" };
	}

	return { ok: true, latitude, longitude };
};

export const mapNominatimToAddress = (result = {}) => {
	const a = result.address || {};
	const road = [a.house_number, a.road].filter(Boolean).join(", ");
	const locality = a.neighbourhood || a.suburb || a.quarter || a.hamlet || "";
	const line1 = road || locality || String(result.display_name || "").split(",")[0].trim();
	const line2 = road && locality ? locality : "";
	const city =
		a.city || a.town || a.city_district || a.village || a.county || a.state_district || "";
	const state = a.state || "";
	const postalCode = a.postcode || "";
	const country = a.country || "India";

	if (!line1 && !city) {
		return {
			ok: false,
			message: "Could not resolve a street address from this location",
		};
	}

	return {
		ok: true,
		incomplete: !line1 || !city || !state || !postalCode,
		address: {
			line1: line1 || city,
			line2,
			city,
			state,
			postalCode,
			country,
		},
	};
};
