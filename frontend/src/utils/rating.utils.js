const STYLES = {
	5: {
		star: "fill-emerald-500 text-emerald-500",
		badge: "bg-emerald-50 text-emerald-800 ring-emerald-100",
		text: "text-emerald-600",
	},
	4: {
		star: "fill-lime-500 text-lime-500",
		badge: "bg-lime-50 text-lime-800 ring-lime-100",
		text: "text-lime-600",
	},
	3: {
		star: "fill-amber-400 text-amber-500",
		badge: "bg-amber-50 text-amber-800 ring-amber-100",
		text: "text-amber-600",
	},
	2: {
		star: "fill-orange-500 text-orange-500",
		badge: "bg-orange-50 text-orange-800 ring-orange-100",
		text: "text-orange-600",
	},
	1: {
		star: "fill-red-500 text-red-500",
		badge: "bg-red-50 text-red-700 ring-red-100",
		text: "text-red-600",
	},
	0: {
		star: "fill-slate-300 text-slate-300",
		badge: "bg-slate-50 text-slate-500 ring-slate-100",
		text: "text-slate-400",
	},
};

export const getRatingStyle = (rating) => {
	const n = Math.round(Number(rating) || 0);
	const key = Math.min(5, Math.max(0, n));
	return STYLES[key];
};
