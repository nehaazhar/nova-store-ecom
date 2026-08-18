export const debounce = (fn, wait = 300) => {
	let timer;
	const debounced = (...args) => {
		clearTimeout(timer);
		timer = setTimeout(() => fn(...args), wait);
	};
	debounced.cancel = () => {
		clearTimeout(timer);
		timer = undefined;
	};
	return debounced;
};

export const throttle = (fn, wait = 200) => {
	let last = 0;
	let timer;
	let lastArgs;

	const invoke = () => {
		last = Date.now();
		timer = undefined;
		fn(...lastArgs);
		lastArgs = undefined;
	};

	const throttled = (...args) => {
		lastArgs = args;
		const remaining = wait - (Date.now() - last);
		if (remaining <= 0) {
			clearTimeout(timer);
			invoke();
			return;
		}
		if (!timer) {
			timer = setTimeout(invoke, remaining);
		}
	};

	throttled.cancel = () => {
		clearTimeout(timer);
		timer = undefined;
		lastArgs = undefined;
	};

	return throttled;
};
