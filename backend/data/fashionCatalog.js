import {
	buildVariantsFromOptions,
	totalVariantStock,
} from "../utils/variant.utils.js";

const u = (id) =>
	`https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

const CATEGORY_IMAGES = {
	jeans: [
		u("photo-1541099649105-f69ad21f3246"),
		u("photo-1604176354204-9268737828e4"),
		u("photo-1591195853828-11db59a44f6b"),
		u("photo-1624378439575-d8705ad7ae80"),
		u("photo-1583744946564-b52ac1c389c8"),
		u("photo-1565084888279-aca607ecce0c"),
		u("photo-1576995853123-5a10305d93c0"),
	],
	"t-shirts": [
		u("photo-1521572163474-6864f9cf17ab"),
		u("photo-1583743814966-8936f5b7be1a"),
		u("photo-1576566588028-4147f3842f27"),
		u("photo-1562157873-818bc0726f68"),
		u("photo-1554568218-0f1715e72254"),
		u("photo-1618354691373-d851c5c3a990"),
		u("photo-1503342217505-b0a15ec3261c"),
		u("photo-1603252109303-2751441dd157"),
	],
	shoes: [
		u("photo-1549298916-b41d501d3772"),
		u("photo-1542291026-7eec264c27ff"),
		u("photo-1606107557195-0e29a4b5b4aa"),
		u("photo-1543163521-1bf539c55dd2"),
		u("photo-1533867617858-e7b97e060509"),
		u("photo-1603487742131-4160ec999306"),
		u("photo-1460353581641-37baddab0fa2"),
		u("photo-1595950653106-6c9ebd614d3a"),
	],
	glasses: [
		u("photo-1511499767150-a48a237f0083"),
		u("photo-1574258495973-f010dfbb5371"),
		u("photo-1577803645773-f96470509666"),
		u("photo-1572635196237-14b3f281503f"),
		u("photo-1473496169904-658ba7c44d8a"),
		u("photo-1508296695146-257a814070b4"),
		u("photo-1625591339971-4c9a87a66871"),
	],
	jackets: [
		u("photo-1551028719-00167b16eac5"),
		u("photo-1521223890158-f9f7c3d5d504"),
		u("photo-1495105787522-5334e3ffa0ef"),
		u("photo-1539533018447-63fcce2678e3"),
		u("photo-1591047139829-d91aecb6caea"),
		u("photo-1544022613-e87ca75a784a"),
		u("photo-1487222477894-8943e31ef7b2"),
		u("photo-1611312449408-fcece27cdbb7"),
	],
	suits: [
		u("photo-1594938298603-c8148c4dae35"),
		u("photo-1593032465175-481ac7f401a0"),
		u("photo-1617127365659-c47fa864d8bc"),
		u("photo-1507680434567-5739c80be1ac"),
		u("photo-1617137968427-85924c800a22"),
		u("photo-1610652492500-ded49ceeb378"),
		u("photo-1580657018950-c7f7d6a6d990"),
		u("photo-1552374196-1ab2a1c593e8"),
	],
	bags: [
		u("photo-1590874103328-eac38a683ce7"),
		u("photo-1548036328-c9fa89d128fa"),
		u("photo-1553062407-98eeb64c6a62"),
		u("photo-1584917865442-de89df76afd3"),
		u("photo-1622560480605-d83c853bc5c3"),
		u("photo-1598532163257-ae3c6b2524b6"),
		u("photo-1566150905458-1bf1fc113f0d"),
		u("photo-1434389677669-e08b4cac3105"),
	],
};

const VARIANT_OPTIONS = {
	jeans: {
		sizes: ["S", "M", "L", "XL"],
		colors: ["Blue", "Black", "Grey"],
		styles: ["Slim", "Regular", "Relaxed"],
	},
	"t-shirts": {
		sizes: ["S", "M", "L", "XL"],
		colors: ["White", "Black", "Navy", "Olive"],
		styles: ["Crew Neck", "V-Neck", "Oversized"],
	},
	shoes: {
		sizes: ["6", "7", "8", "9", "10", "11"],
		colors: ["Black", "White", "Brown"],
		styles: ["Casual", "Sport", "Formal"],
	},
	glasses: {
		sizes: ["One Size"],
		colors: ["Black", "Tortoise", "Gold"],
		styles: ["Aviator", "Wayfarer", "Round"],
	},
	jackets: {
		sizes: ["S", "M", "L", "XL"],
		colors: ["Black", "Brown", "Olive"],
		styles: ["Bomber", "Denim", "Leather"],
	},
	suits: {
		sizes: ["S", "M", "L", "XL"],
		colors: ["Navy", "Charcoal", "Black"],
		styles: ["Two-Piece", "Three-Piece"],
	},
	bags: {
		sizes: ["One Size"],
		colors: ["Black", "Tan", "Brown"],
		styles: ["Tote", "Crossbody", "Backpack"],
	},
};

const productBlueprints = {
	jeans: [
		["Classic Blue Slim Fit Jeans", "Comfort stretch denim with a slim tapered fit.", 1499, true],
		["Black Skinny Stretch Jeans", "Deep black wash with high stretch for all-day comfort.", 1699],
		["Vintage Light Wash Straight Jeans", "Relaxed straight cut with a soft vintage fade.", 1599],
		["High-Rise Wide Leg Jeans", "Trendy wide-leg silhouette with a flattering high rise.", 1899, true],
		["Ripped Distressed Boyfriend Jeans", "Casual distressed details with a roomy boyfriend fit.", 1799],
		["Dark Indigo Tapered Jeans", "Clean dark indigo wash, mid-rise, tapered ankle.", 1999],
		["Cargo Utility Denim Jeans", "Utility pockets meet classic denim for weekend wear.", 2099],
		["Grey Acid Wash Mom Jeans", "Soft grey acid wash with a comfy mom-jean cut.", 1649],
		["Raw Selvedge Regular Fit Jeans", "Premium raw denim look with regular fit.", 2499],
		["Eco Soft Stretch Jeggings", "Ultra-soft stretch denim jeggings with jean styling.", 1299],
	],
	"t-shirts": [
		["Essential White Crew Tee", "Breathable cotton crew neck for everyday wear.", 499, true],
		["Black Oversized Graphic Tee", "Relaxed oversized fit with a bold front graphic.", 799],
		["Pastel Pink Soft Cotton Tee", "Muted pastel shade in premium soft cotton.", 599],
		["Striped Navy Casual Tee", "Classic stripes with a smart-casual vibe.", 899],
		["Olive Green Pocket Tee", "Utility-inspired pocket tee in earthy olive.", 699],
		["Cropped Ribbed Basic Tee", "Ribbed texture with a modern cropped length.", 649],
		["Heather Grey Longline Tee", "Longer hem for layered looks in soft heather grey.", 749],
		["Retro Print Washed Tee", "Vintage-inspired print on washed cotton.", 849, true],
		["Performance Dry-Fit Tee", "Moisture-wicking fabric for workouts and hot days.", 999],
		["Minimal Logo Embroidered Tee", "Clean minimal branding with subtle embroidery.", 899],
	],
	shoes: [
		["White Everyday Sneakers", "Clean white sneakers with cushioned sole.", 2999, true],
		["Running Mesh Trainers", "Breathable mesh upper with responsive cushioning.", 3499],
		["Chunky Platform Sneakers", "Bold chunky sole with retro street vibes.", 3799],
		["Classic Canvas Low Tops", "Timeless canvas sneakers, light and casual.", 1999],
		["Suede Desert Boots", "Soft suede finish for smart-casual outfits.", 3299],
		["Slip-On Everyday Loafers", "Easy slip-on design with padded insole.", 2599],
		["High-Top Court Sneakers", "Supportive high-top build with grip outsole.", 3999, true],
		["Trail Hiking Shoes", "Rugged outsole for weekend trails.", 4499],
		["Minimal Black Formal Shoes", "Sleek black shoes for office and events.", 3599],
		["Summer Slide Sandals", "Cushioned slides for casual summers.", 1299],
	],
	glasses: [
		["Matte Black Wayfarer Sunglasses", "UV-ready classic wayfarer for everyday sun.", 1299, true],
		["Gold Rim Round Specs", "Lightweight metal round frames.", 1499],
		["Transparent Clear Frame Glasses", "Trendy crystal-clear frames.", 1199],
		["Aviator Gradient Sunglasses", "Iconic aviator shape with gradient lenses.", 1599, true],
		["Blue Light Blocker Glasses", "Screen-time friendly rectangular frames.", 999],
		["Tortoise Shell Cat-Eye Frames", "Warm tortoise shell cat-eye acetate.", 1699],
		["Sport Wrap Sunglasses", "Secure wrap fit for outdoor activity.", 1799],
		["Minimal Rimless Readers", "Ultra-light rimless design.", 899],
		["Oversized Square Sunglasses", "Bold oversized squares for summer looks.", 1399],
		["Clubmaster Dual-Tone Frames", "Semi-rimless browline dual-tone style.", 1549],
	],
	jackets: [
		["Olive Bomber Jacket", "Classic bomber with ribbed cuffs for cool evenings.", 2999, true],
		["Black Biker Jacket", "Edgy biker silhouette with asymmetric zip.", 4499],
		["Denim Trucker Jacket", "Hard-wearing denim trucker with chest pockets.", 2799],
		["Puffer Packable Jacket", "Lightweight puffer that packs for travel.", 3499, true],
		["Wool Blend Overcoat", "Long overcoat for sharp winter layering.", 5999],
		["Utility Field Jacket", "Multi-pocket field jacket in midweight cotton.", 3299],
		["Hooded Rain Shell", "Water-resistant shell with adjustable hood.", 2499],
		["Sherpa Lined Trucker", "Cozy sherpa lining in a classic trucker shell.", 3699],
		["Satin Evening Bomber", "Smooth satin bomber for nights out.", 3199],
		["Quilted Lightweight Vest", "Sleeveless quilted vest for core warmth.", 1999],
	],
	suits: [
		["Navy Two-Piece Formal Suit", "Tailored navy suit for interviews and weddings.", 7999, true],
		["Charcoal Slim Fit Suit", "Modern slim fit in charcoal grey.", 8499],
		["Black Dinner Suit", "Sharp black formal look for evening events.", 9999, true],
		["Beige Summer Linen Suit", "Breathable linen-blend for warm weather.", 7499],
		["Check Pattern Business Suit", "Subtle check pattern for contemporary offices.", 8799],
		["Three Piece Waistcoat Suit", "Jacket, trousers, and matching waistcoat.", 10999],
		["Olive Green Party Suit", "Stand-out olive tone for receptions.", 8299],
		["Light Grey Wedding Suit", "Soft light grey that photographs well.", 8999],
		["Double Breasted Blazer Suit", "Power double-breasted jacket with trousers.", 9499],
		["Travel Stretch Comfort Suit", "Wrinkle-resistant stretch for long days.", 7699],
	],
	bags: [
		["Leather Everyday Tote", "Spacious tote with inner pockets for work and college.", 2499, true],
		["Minimal Crossbody Sling", "Compact crossbody for hands-free city days.", 1499],
		["Laptop Backpack 15-inch", "Padded laptop sleeve with organized compartments.", 2999, true],
		["Quilted Chain Shoulder Bag", "Evening-ready quilted bag with chain strap.", 2799],
		["Canvas Weekender Duffel", "Roomy weekender for short trips.", 3299],
		["Mini Belt Bag", "Hands-free mini belt bag for travel days.", 999],
		["Structured Box Handbag", "Clean structured silhouette for formal outfits.", 3199],
		["Gym Sports Duffel", "Sports duffel with shoe compartment.", 1899],
		["Vintage Messenger Bag", "Classic messenger flap, laptop-friendly.", 2699],
		["Drawstring Casual Backpack", "Lightweight drawstring pack for errands.", 799],
	],
};

const imagesFor = (category, productIndex) => {
	const pool = CATEGORY_IMAGES[category] || [];
	const count = Math.min(3, pool.length);
	const images = [];
	for (let i = 0; i < count; i++) {
		images.push(pool[(productIndex + i) % pool.length]);
	}
	return images;
};

export const buildCatalogDocs = () => {
	const docs = [];
	for (const [category, items] of Object.entries(productBlueprints)) {
		const opts = VARIANT_OPTIONS[category];
		items.forEach(([name, description, price, isFeatured], index) => {
			const perVariantStock = 8 + ((index * 3) % 10);
			const variants = buildVariantsFromOptions(
				opts.sizes,
				opts.colors,
				perVariantStock,
				[]
			);
			docs.push({
				name,
				description,
				price,
				category,
				isFeatured: Boolean(isFeatured),
				images: imagesFor(category, index),
				sizes: opts.sizes,
				colors: opts.colors,
				styles: opts.styles,
				variants,
				stock: totalVariantStock(variants),
			});
		});
	}
	return docs;
};
