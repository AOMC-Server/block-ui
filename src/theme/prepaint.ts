import { DEFAULT_MODE, DEFAULT_STYLE } from "./defaults";
import { STYLES } from "./theme";

/** What the saved appearance (read by `reader`) may contain. Anything invalid is ignored. */
export type SavedAppearance = {
	mode?: "system" | "dark" | "light";
	style?: string;
	palette?: string;
};

/** What a reader gets besides the parsed value: the things it may need to decide. */
export type PrepaintContext = {
	storage: Storage;
	/** Whether the system asks for light colours. */
	light: boolean;
	location: Location;
};

export type PrepaintReader = (
	// biome-ignore lint/suspicious/noExplicitAny: the shape of what an app stores is its own
	stored: any,
	ctx: PrepaintContext,
) => SavedAppearance | null | undefined;

export type PrepaintOptions = {
	/** localStorage key holding JSON. Default "block-ui.appearance". */
	storageKey?: string;
	/**
	 * Turns the parsed JSON of `storageKey` (null when there is none) into the appearance to
	 * apply. Default: the value itself, which should look like `{ mode, style, palette }`.
	 * It is serialised into the page: pass a self-contained function (or its source as a
	 * string) that uses nothing from the module around it.
	 */
	reader?: string | PrepaintReader;
	/** Applied when nothing valid is saved. Default dark, bedrock, no palette. */
	defaults?: { mode?: "dark" | "light"; style?: string; palette?: string };
	/** Palettes the reader may pick; any name is accepted when omitted. */
	palettes?: readonly string[];
};

/**
 * The source of the inline <script> for index.html that applies the saved mode, style and
 * palette to <html> before the first paint, so there is no flash of the wrong look. The app takes
 * over with applyAppearance() once it has started. Put it in <head>, before the stylesheets.
 *
 * Vite: add it with `transformIndexHtml` (see README), or paste the output of
 * `prepaintScript()` into a <script> tag.
 */
export function prepaintScript(opts: PrepaintOptions = {}): string {
	const key = opts.storageKey ?? "block-ui.appearance";
	const reader = String(opts.reader ?? "(saved) => saved");
	const defaults = {
		mode: opts.defaults?.mode ?? DEFAULT_MODE,
		style: opts.defaults?.style ?? DEFAULT_STYLE,
		palette: opts.defaults?.palette,
	};
	const palettes = opts.palettes;
	const lines = [
		"// Apply the saved appearance before first paint; the app takes over from here (see applyAppearance).",
		"{",
		"	const root = document.documentElement.dataset;",
		`	root.mode = ${JSON.stringify(defaults.mode)};`,
		`	root.style = ${JSON.stringify(defaults.style)};`,
		...(defaults.palette
			? [`	root.palette = ${JSON.stringify(defaults.palette)};`]
			: []),
		"	try {",
		`		const STYLES = ${JSON.stringify(STYLES.map((s) => s.id))};`,
		...(palettes ? [`		const PALETTES = ${JSON.stringify(palettes)};`] : []),
		"		const light = matchMedia('(prefers-color-scheme: light)').matches;",
		`		const read = ${reader};`,
		`		const a = read(JSON.parse(localStorage.getItem(${JSON.stringify(key)}) || "null"), { storage: localStorage, light, location }) || {};`,
		'		if (a.mode === "light" || (a.mode === "system" && light)) root.mode = "light";',
		'		else if (a.mode === "dark" || a.mode === "system") root.mode = "dark";',
		"		if (STYLES.includes(a.style)) root.style = a.style;",
		palettes
			? '		if (typeof a.palette === "string" && PALETTES.includes(a.palette)) root.palette = a.palette;'
			: '		if (typeof a.palette === "string" && a.palette) root.palette = a.palette;',
		"	} catch {}",
		"}",
	];
	return lines.join("\n");
}
