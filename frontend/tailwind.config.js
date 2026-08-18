/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			colors: {
				nova: {
					ink: "#08111f",
					muted: "#64748b",
					line: "#e2e8f0",
					bg: "#f1f5f9",
					surface: "#ffffff",
					accent: "#0d9488",
					"accent-dark": "#0f766e",
					glow: "#ccfbf1",
					sand: "#f8fafc",
				},
			},
			fontFamily: {
				sans: ["DM Sans", "system-ui", "sans-serif"],
				display: ["Syne", "DM Sans", "sans-serif"],
			},
			boxShadow: {
				soft: "0 24px 60px -28px rgba(8, 17, 31, 0.35)",
				card: "0 8px 30px -12px rgba(8, 17, 31, 0.14)",
				lift: "0 20px 40px -20px rgba(13, 148, 136, 0.35)",
				nav: "0 1px 0 rgba(8,17,31,0.06), 0 8px 24px -16px rgba(8,17,31,0.18)",
			},
			backgroundImage: {
				"hero-mesh":
					"radial-gradient(ellipse 90% 70% at 80% 10%, rgba(13,148,136,0.35), transparent 55%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(8,17,31,0.12), transparent)",
				"accent-shine":
					"linear-gradient(135deg, #14b8a6 0%, #0d9488 45%, #0f766e 100%)",
			},
			keyframes: {
				fadeUp: {
					"0%": { opacity: "0", transform: "translateY(22px)" },
					"100%": { opacity: "1", transform: "translateY(0)" },
				},
				fadeIn: {
					"0%": { opacity: "0" },
					"100%": { opacity: "1" },
				},
				float: {
					"0%, 100%": { transform: "translateY(0)" },
					"50%": { transform: "translateY(-8px)" },
				},
				shimmer: {
					"0%": { backgroundPosition: "200% 0" },
					"100%": { backgroundPosition: "-200% 0" },
				},
			},
			animation: {
				"fade-up": "fadeUp 0.75s ease-out both",
				"fade-in": "fadeIn 1s ease-out both",
				float: "float 5s ease-in-out infinite",
				shimmer: "shimmer 2.5s linear infinite",
			},
		},
	},
	plugins: [],
};
