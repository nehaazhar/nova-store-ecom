const STYLES = {
	5: {
		star: "fill-emerald-500 text-emerald-500",
		badge: "bg-emerald-50 text-emerald-800 ring-emerald-200",
		text: "text-emerald-600",
	},
	4: {
		star: "fill-sky-500 text-sky-500",
		badge: "bg-sky-50 text-sky-800 ring-sky-200",
		text: "text-sky-600",
	},
	3: {
		star: "fill-yellow-400 text-yellow-500",
		badge: "bg-yellow-50 text-yellow-800 ring-yellow-200",
		text: "text-yellow-600",
	},
	2: {
		star: "fill-orange-500 text-orange-500",
		badge: "bg-orange-50 text-orange-800 ring-orange-200",
		text: "text-orange-600",
	},
	1: {
		star: "fill-red-500 text-red-500",
		badge: "bg-red-50 text-red-700 ring-red-200",
		text: "text-red-600",
	},
	0: {
		star: "fill-slate-300 text-slate-300",
		badge: "bg-slate-50 text-slate-500 ring-slate-200",
		text: "text-slate-400",
	},
};

/** Color bucket is the whole-number rating (1–5). 4.9 stays 4 (blue), only 5.0 is green. */
export const getRatingStyle = (rating) => {
	const n = Math.floor(Number(rating) || 0);
	const key = Math.min(5, Math.max(0, n));
	return STYLES[key] || STYLES[0];
};
