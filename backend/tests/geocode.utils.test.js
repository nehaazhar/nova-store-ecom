import test from "node:test";
import assert from "node:assert/strict";
import { mapNominatimToAddress, parseCoordinates } from "../utils/geocode.utils.js";

test("parseCoordinates rejects missing or invalid values", () => {
	assert.equal(parseCoordinates({}).ok, false);
	assert.equal(parseCoordinates({ latitude: "abc", longitude: 77 }).ok, false);
	assert.equal(parseCoordinates({ latitude: 91, longitude: 77 }).ok, false);
});

test("parseCoordinates accepts lat/lng aliases", () => {
	const parsed = parseCoordinates({ lat: 28.6139, lng: 77.209 });
	assert.equal(parsed.ok, true);
	assert.equal(parsed.latitude, 28.6139);
	assert.equal(parsed.longitude, 77.209);
});

test("mapNominatimToAddress fills India-style address fields", () => {
	const mapped = mapNominatimToAddress({
		display_name: "Connaught Place, New Delhi, Delhi, India",
		address: {
			house_number: "12",
			road: "Inner Circle",
			suburb: "Connaught Place",
			city: "New Delhi",
			state: "Delhi",
			postcode: "110001",
			country: "India",
		},
	});

	assert.equal(mapped.ok, true);
	assert.equal(mapped.address.line1, "12, Inner Circle");
	assert.equal(mapped.address.line2, "Connaught Place");
	assert.equal(mapped.address.city, "New Delhi");
	assert.equal(mapped.address.state, "Delhi");
	assert.equal(mapped.address.postalCode, "110001");
	assert.equal(mapped.address.country, "India");
});

test("mapNominatimToAddress marks incomplete when PIN is missing", () => {
	const mapped = mapNominatimToAddress({
		address: {
			road: "MG Road",
			city: "Bengaluru",
			state: "Karnataka",
			country: "India",
		},
	});
	assert.equal(mapped.ok, true);
	assert.equal(mapped.incomplete, true);
	assert.equal(mapped.address.postalCode, "");
});

test("mapNominatimToAddress fails when no street or city is present", () => {
	const mapped = mapNominatimToAddress({
		address: { country: "India" },
	});
	assert.equal(mapped.ok, false);
});
