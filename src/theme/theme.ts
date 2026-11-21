import { computed, type Signal, signal } from "@preact/signals";

/**
 * The look of the interface is three independent choices, each an attribute on <html> that
 * css/tokens.css keys on:
 * - data-mode: dark or light, chosen by the user (or following the system);
 * - data-palette: the colours; the library ships "overworld" (the default), apps add their own;
 * - data-style: the shapes (corners, borders, bevels, fonts), chosen by the user.
 */

export const STYLES = [
	{
		id: "bedrock",
		name: "Bedrock",
		hint: "Flat, hard edges and a depth edge.",
	},
	{
		id: "win98",
		name: "Windows 98",
		hint: "Grey 3D bevels and gradient title bars.",
	},
	{ id: "xp", name: "Windows XP", hint: "Glossy title bars and soft corners." },
	{
		id: "modern",
		name: "Modern",
		hint: "Rounded, thin borders, soft shadows.",
	},
] as const;

export type StyleId = (typeof STYLES)[number]["id"];

export const MODES = [
	{ id: "system", name: "System" },
	{ id: "dark", name: "Dark" },
	{ id: "light", name: "Light" },
] as const;

export type ModeChoice = (typeof MODES)[number]["id"];
export type Mode = "dark" | "light";

export const isStyle = (value: unknown): value is StyleId =>
	STYLES.some((s) => s.id === value);

export const isModeChoice = (value: unknown): value is ModeChoice =>
	MODES.some((m) => m.id === value);

export const resolveMode = (choice: ModeChoice, prefersLight: boolean): Mode =>
	choice === "system" ? (prefersLight ? "light" : "dark") : choice;

let systemLight: Signal<boolean> | undefined;

/** Starts following the system on first use, so that importing this module does nothing. */
function followSystem(): Signal<boolean> {
	const query = globalThis.matchMedia?.("(prefers-color-scheme: light)");
	const light = signal(query?.matches ?? false);
	query?.addEventListener("change", (e) => {
		light.value = e.matches;
	});
	return light;
}

/** Whether the system asks for light colours; follows changes once it has been read. */
export const prefersLight = computed(() => {
	systemLight ??= followSystem();
	return systemLight.value;
});

export type Appearance = {
	mode: Mode;
	style: StyleId;
	/**
	 * The palette name (an app's own, or "overworld"). `undefined` leaves the palette as it is,
	 * `null` removes the attribute (the default palette).
	 */
	palette?: string | null;
};

/** The appearance that is applied now, for things that carry a look of their own on top of it. */
export const appearance = signal<Appearance | null>(null);

export function applyAppearance(a: Appearance) {
	const root = document.documentElement.dataset;
	root.mode = a.mode;
	root.style = a.style;
	if (a.palette === null) delete root.palette;
	else if (a.palette !== undefined) root.palette = a.palette;
	appearance.value = { ...a, palette: a.palette ?? null };
}

/**
 * Attributes that give an element a palette of its own (a dye, a dimension), in the mode and
 * style in use. The mode and style are repeated because a palette's tokens are selected by
 * `[data-palette][data-mode]` on the element itself, and the tokens derived from them (title
 * bars, shadows) are worked out where the style is declared; see css/tokens.css.
 *
 * It reads the `appearance` signal, so calling it while rendering keeps the element up to date
 * when the mode or style changes. Before `applyAppearance` has run, the attributes on <html> are
 * used.
 *
 *     <div {...paletteScope("nether")}>...</div>
 */
export function paletteScope(
	palette: string | null | undefined,
): Record<string, string> {
	if (!palette) return {};
	const a = appearance.value;
	const root =
		typeof document === "undefined"
			? undefined
			: document.documentElement.dataset;
	const mode = a?.mode ?? root?.mode;
	const style = a?.style ?? root?.style;
	return {
		"data-palette": palette,
		...(mode ? { "data-mode": mode } : {}),
		...(style ? { "data-style": style } : {}),
	};
}
