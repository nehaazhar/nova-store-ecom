import { useEffect, useMemo, useRef } from "react";
import { throttle } from "../utils/timing.utils";

export const useThrottledCallback = (fn, wait = 200) => {
	const fnRef = useRef(fn);
	fnRef.current = fn;

	const throttled = useMemo(
		() => throttle((...args) => fnRef.current(...args), wait),
		[wait]
	);

	useEffect(() => () => throttled.cancel(), [throttled]);

	return throttled;
};
