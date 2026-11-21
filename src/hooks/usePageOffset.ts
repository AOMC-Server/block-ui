import { useState } from "preact/hooks";

/**
 * A page offset that goes back to 0 whenever `key` (the filters it belongs to) changes. Plain
 * component state: it does not touch the URL.
 */
export function usePageOffset(key: string): [number, (offset: number) => void] {
	const [state, setState] = useState({ key, offset: 0 });
	const offset = state.key === key ? state.offset : 0;
	return [offset, (o) => setState({ key, offset: o })];
}
