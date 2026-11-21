import { effect, type ReadonlySignal, signal } from "@preact/signals";

export type WidthStoreOptions = {
	/** localStorage key the width is kept under. */
	key: string;
	min: number;
	/** The widest it may be: a number, or a function of the window width (to leave room for the rest). */
	max: number | ((windowWidth: number) => number);
	default: number;
	/** If given, this custom property on <html> follows the width. */
	cssVar?: string;
	/** The value of `cssVar` for a width. Default `${width}px`. */
	cssValue?: (width: number) => string;
};

export type WidthStore = {
	/** The width in pixels. */
	width: ReadonlySignal<number>;
	min: number;
	default: number;
	/** The widest it may be in a window of this width (default: the current one). */
	max: (windowWidth?: number) => number;
	/** `width` kept between the minimum and the maximum, rounded. */
	clamp: (width: number, windowWidth?: number) => number;
	/** `persist: false` applies a change without saving it yet, for values that change continuously. */
	set: (width: number, persist?: boolean) => void;
	/** Back to the default, forgetting what was saved. */
	reset: () => void;
	/** Stops updating the css variable. */
	dispose: () => void;
};

const read = (key: string): string | null => {
	try {
		return globalThis.localStorage?.getItem(key) ?? null;
	} catch {
		return null;
	}
};

const write = (key: string, value: string | null) => {
	try {
		if (value === null) globalThis.localStorage?.removeItem(key);
		else globalThis.localStorage?.setItem(key, value);
	} catch {
		// Storage can be unavailable (private mode, full); the width then lasts for this visit only.
	}
};

/**
 * A width the user can change (a side panel dragged wider or narrower), kept in localStorage and
 * optionally mirrored in a CSS variable so everything beside it can follow. Use it with the
 * `resize` prop of Panel:
 *
 *     const panelWidth = createWidthStore({ key: "app.panelWidth", min: 320,
 *       max: (w) => Math.min(w - 16, w * 0.7, 900), default: 400, cssVar: "--panel-w" });
 *     <Panel resize={{ width: panelWidth.width.value, min: panelWidth.min, max: panelWidth.max(),
 *       onChange: panelWidth.set, onReset: panelWidth.reset }} />
 */
export function createWidthStore(opts: WidthStoreOptions): WidthStore {
	const windowWidth = () => globalThis.innerWidth ?? 1280;
	const max = (w = windowWidth()) =>
		Math.max(opts.min, typeof opts.max === "function" ? opts.max(w) : opts.max);
	const clamp = (width: number, w = windowWidth()) =>
		Math.round(Math.min(Math.max(width, opts.min), max(w)));

	const stored = Number(read(opts.key));
	const width = signal<number>(
		Number.isFinite(stored) && stored > 0 ? clamp(stored) : opts.default,
	);

	let dispose = () => {};
	if (opts.cssVar && typeof document !== "undefined") {
		const name = opts.cssVar;
		const value = opts.cssValue ?? ((w: number) => `${w}px`);
		dispose = effect(() => {
			document.documentElement.style.setProperty(name, value(width.value));
		});
	}

	return {
		width,
		min: opts.min,
		default: opts.default,
		max,
		clamp,
		set(next, persist = true) {
			width.value = clamp(next);
			if (persist) write(opts.key, String(width.value));
		},
		reset() {
			width.value = opts.default;
			write(opts.key, null);
		},
		dispose: () => dispose(),
	};
}
