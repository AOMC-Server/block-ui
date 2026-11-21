import { signal } from "@preact/signals";

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

export const DEFAULT_STYLE: StyleId = "bedrock";
export const DEFAULT_MODE: Mode = "dark";

export const isStyle = (value: unknown): value is StyleId =>
	STYLES.some((s) => s.id === value);

export const isModeChoice = (value: unknown): value is ModeChoice =>
	MODES.some((m) => m.id === value);

export const resolveMode = (choice: ModeChoice, prefersLight: boolean): Mode =>
	choice === "system" ? (prefersLight ? "light" : "dark") : choice;

const lightQuery = globalThis.matchMedia?.("(prefers-color-scheme: light)");

/** Whether the system asks for light colours; follows changes. */
export const prefersLight = signal(lightQuery?.matches ?? false);
lightQuery?.addEventListener("change", (e) => {
	prefersLight.value = e.matches;
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
 * style in use. The mode and style are repeated because the tokens derived from them are worked
 * out where they are declared; see css/tokens.css.
 *
 *     <div {...paletteScope("nether")}>...</div>
 */
export function paletteScope(
	palette: string | null | undefined,
): Record<string, string> {
	if (!palette) return {};
	const a = appearance.peek();
	return {
		"data-palette": palette,
		...(a ? { "data-mode": a.mode, "data-style": a.style } : {}),
	};
}
