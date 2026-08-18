import axios from "../lib/axios";

const geolocationErrorMessage = (error) => {
	if (!error) return "Could not read your location";
	if (error.code === 1) return "Location permission denied. Allow location access and try again.";
	if (error.code === 2) return "Location unavailable. Check GPS and try again.";
	if (error.code === 3) return "Location request timed out. Try again.";
	return error.message || "Could not read your location";
};

export const getBrowserCoordinates = () =>
	new Promise((resolve, reject) => {
		if (!navigator.geolocation) {
			reject(new Error("Geolocation is not supported in this browser"));
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				resolve({
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
				});
			},
			(error) => {
				reject(new Error(geolocationErrorMessage(error)));
			},
			{
				enableHighAccuracy: true,
				timeout: 15000,
				maximumAge: 60000,
			}
		);
	});

export const lookupAddressFromCoordinates = async ({ latitude, longitude }) => {
	const res = await axios.post("/addresses/from-location", { latitude, longitude });
	return res.data;
};
