import type { ReadonlySignal } from "@preact/signals";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";

export type AsyncState<T> = {
	/** The last result; stays while a newer one loads. */
	data: T | null;
	/** The message of the last failure, cleared by the next success. */
	error: string | null;
	loading: boolean;
	/** Loads again, quietly (the old data stays). */
	reload: () => void;
};

export type AsyncOptions = {
	/** Load again every this many milliseconds. */
	pollMs?: number;
	/** Load again (once things settle) whenever this signal changes; its first value is ignored. */
	refresh?: ReadonlySignal<unknown>;
	/** How long to wait after a `refresh` change, so a burst of them loads once. Default 400. */
	refreshDelayMs?: number;
};

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Loads something whenever `deps` change. `load` returns the data or throws; its argument is an
 * AbortSignal that fires when the result is no longer wanted (pass it to fetch). A stale
 * result (from before the deps changed or a newer load) is ignored, and the previous data stays
 * visible while the next loads. Pass `null` to skip loading (nothing to ask for yet): data and
 * error are cleared then, as they belong to what was asked before.
 *
 * `deps` must have the same length on every render (they are spread into the hook's own list);
 * list the values `load` reads, as for `useEffect`.
 *
 *     const users = useAsync((signal) => getJson<User[]>(`/api/users?q=${q}`, signal), [q]);
 */
export function useAsync<T>(
	load: ((signal: AbortSignal) => Promise<T>) | null,
	deps: readonly unknown[],
	opts: AsyncOptions = {},
): AsyncState<T> {
	const [state, setState] = useState<Omit<AsyncState<T>, "reload">>({
		data: null,
		error: null,
		loading: load !== null,
	});
	const [tick, setTick] = useState(0);
	const reload = useCallback(() => setTick((t) => t + 1), []);
	const fn = useRef(load);
	fn.current = load;
	const enabled = load !== null;

	useEffect(() => {
		const run = fn.current;
		if (!run) {
			setState((s) =>
				s.loading || s.data !== null || s.error !== null
					? { data: null, error: null, loading: false }
					: s,
			);
			return;
		}
		const abort = new AbortController();
		let stale = false;
		setState((s) => ({ ...s, loading: true }));
		run(abort.signal).then(
			(data) => {
				if (!stale) setState({ data, error: null, loading: false });
			},
			(e: unknown) => {
				if (!stale)
					setState((s) => ({ ...s, error: message(e), loading: false }));
			},
		);
		return () => {
			stale = true;
			abort.abort();
		};
	}, [...deps, enabled, tick]);

	const { pollMs, refresh, refreshDelayMs = 400 } = opts;

	useEffect(() => {
		if (!pollMs || !enabled) return;
		const h = setInterval(reload, pollMs);
		return () => clearInterval(h);
	}, [pollMs, enabled, reload]);

	useEffect(() => {
		if (!refresh || !enabled) return;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let first = true;
		const off = refresh.subscribe(() => {
			if (first) {
				first = false;
				return;
			}
			clearTimeout(timer);
			timer = setTimeout(reload, refreshDelayMs);
		});
		return () => {
			off();
			clearTimeout(timer);
		};
	}, [refresh, enabled, refreshDelayMs, reload]);

	return { ...state, reload };
}
