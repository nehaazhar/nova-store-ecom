import { useEffect, useState } from "react";

const PLACEHOLDER =
	"data:image/svg+xml;charset=UTF-8," +
	encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
			<rect fill="#1f2937" width="800" height="800"/>
			<text x="50%" y="50%" fill="#9ca3af" font-family="Arial" font-size="28" text-anchor="middle" dy=".3em">No Image</text>
		</svg>`
	);

const ProductImage = ({
	src,
	alt = "Product",
	className = "",
	fallback = PLACEHOLDER,
}) => {
	const [currentSrc, setCurrentSrc] = useState(src || fallback);

	useEffect(() => {
		setCurrentSrc(src || fallback);
	}, [src, fallback]);

	return (
		<img
			src={currentSrc}
			alt={alt}
			className={className}
			loading="lazy"
			onError={() => {
				if (currentSrc !== fallback) setCurrentSrc(fallback);
			}}
		/>
	);
};

export default ProductImage;
export { PLACEHOLDER };
