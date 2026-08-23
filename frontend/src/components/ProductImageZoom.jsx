import { useRef, useState } from "react";
import { ZoomIn } from "lucide-react";
import ProductImage from "./ProductImage";

const ZOOM = 2.6;
const LENS = 148;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const ProductImageZoom = ({ src, alt, children, onOpen }) => {
	const frameRef = useRef(null);
	const [hovering, setHovering] = useState(false);
	const [point, setPoint] = useState({ x: 50, y: 50 });
	const [lens, setLens] = useState({ left: 0, top: 0 });

	const trackPointer = (clientX, clientY) => {
		const frame = frameRef.current;
		if (!frame) return;
		const rect = frame.getBoundingClientRect();
		const x = clientX - rect.left;
		const y = clientY - rect.top;
		setPoint({
			x: clamp((x / rect.width) * 100, 0, 100),
			y: clamp((y / rect.height) * 100, 0, 100),
		});
		setLens({
			left: clamp(x - LENS / 2, 0, Math.max(0, rect.width - LENS)),
			top: clamp(y - LENS / 2, 0, Math.max(0, rect.height - LENS)),
		});
	};

	return (
		<div className={`relative ${hovering ? "z-30" : "z-10"}`}>
			<div
				ref={frameRef}
				className="relative aspect-square cursor-zoom-in overflow-hidden rounded-2xl border border-nova-line bg-slate-50"
				onMouseEnter={(e) => {
					setHovering(true);
					trackPointer(e.clientX, e.clientY);
				}}
				onMouseMove={(e) => trackPointer(e.clientX, e.clientY)}
				onMouseLeave={() => setHovering(false)}
				onClick={() => onOpen?.(src)}
				aria-label="Product image, hover to zoom"
			>
				<ProductImage
					src={src}
					alt={alt}
					className="pointer-events-none h-full w-full select-none object-cover"
				/>

				{hovering && (
					<>
						<div
							className="pointer-events-none absolute hidden border-2 border-white/90 bg-white/25 shadow-md ring-1 ring-black/10 lg:block"
							style={{
								width: LENS,
								height: LENS,
								left: lens.left,
								top: lens.top,
							}}
						/>
						<div
							className="pointer-events-none absolute z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-nova-ink shadow-lg ring-1 ring-black/10"
							style={{ left: `${point.x}%`, top: `${point.y}%` }}
						>
							<ZoomIn size={20} strokeWidth={2.25} />
						</div>
					</>
				)}

				{!hovering && (
					<p
						aria-hidden
						className="pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-nova-muted shadow-sm lg:block"
					>
						Hover to zoom
					</p>
				)}

				{children}
			</div>

			{hovering && src && (
				<div
					className="pointer-events-none absolute left-[calc(100%+16px)] top-0 z-40 hidden h-full w-full overflow-hidden rounded-2xl border border-nova-line bg-white shadow-2xl lg:block"
					style={{
						backgroundImage: `url("${src}")`,
						backgroundRepeat: "no-repeat",
						backgroundSize: `${ZOOM * 100}%`,
						backgroundPosition: `${point.x}% ${point.y}%`,
					}}
					aria-hidden
				/>
			)}
		</div>
	);
};

export default ProductImageZoom;
