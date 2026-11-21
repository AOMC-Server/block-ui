import { useEffect, useState } from "preact/hooks";

/** `value`, but only once it has stopped changing for `ms` milliseconds. */
export function useDebounced<T>(value: T, ms = 300): T {
	const [v, setV] = useState(value);
	useEffect(() => {
		const h = setTimeout(() => setV(value), ms);
		return () => clearTimeout(h);
	}, [value, ms]);
	return v;
}
