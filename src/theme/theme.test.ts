import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { effect } from "@preact/signals";
import {
	appearance,
	applyAppearance,
	isModeChoice,
	isStyle,
	paletteScope,
	resolveMode,
	STYLES,
} from "./theme";

const css = (name: string) =>
	readFileSync(new URL(`../../css/${name}`, import.meta.url), "utf8");

describe("appearance", () => {
	test("validates modes and styles", () => {
		expect(isModeChoice("system")).toBe(true);
		expect(isModeChoice("light")).toBe(true);
		expect(isModeChoice("dim")).toBe(false);
		expect(isStyle("xp")).toBe(true);
		expect(isStyle("vista")).toBe(false);
		expect(isStyle(null)).toBe(false);
	});

	test("system mode follows the system preference", () => {
		expect(resolveMode("system", false)).toBe("dark");
		expect(resolveMode("system", true)).toBe("light");
		expect(resolveMode("dark", true)).toBe("dark");
		expect(resolveMode("light", false)).toBe("light");
	});

	test("tokens.css defines the default palette in both modes, and every style", () => {
		const tokens = css("tokens.css");
		expect(tokens).toContain(`[data-palette="overworld"][data-mode="dark"]`);
		expect(tokens).toContain(`[data-palette="overworld"][data-mode="light"]`);
		for (const style of STYLES) {
			expect(tokens).toContain(`[data-style="${style.id}"]`);
		}
	});

	test("every style has its scoped block in styles.css", () => {
		const styles = css("styles.css");
		for (const style of STYLES.filter((s) => s.id !== "bedrock")) {
			expect(styles).toContain(
				`@scope ([data-style="${style.id}"]) to ([data-style])`,
			);
		}
	});

	test("the global focus ring has no specificity, so controls can draw their own", () => {
		const base = css("base.css");
		expect(base).toContain(":where(:focus-visible) {");
		expect(base).not.toMatch(/^:focus-visible/m);
	});

	test("an embedded page is a plain window surface in the windowed styles", () => {
		const styles = css("styles.css");
		for (const style of ["win98", "xp"]) {
			const start = styles.indexOf(`@scope ([data-style="${style}"])`);
			const block = styles.slice(start, styles.indexOf("\n}\n", start));
			expect(block, style).toMatch(
				/\.page-root\.embedded \{\s*background: var\(--s1\);/,
			);
		}
	});

	test("tokens.css has the tokens the components use", () => {
		const tokens = css("tokens.css");
		for (const token of [
			"--warn",
			"--on-warn",
			"--on-accent",
			"--page-max",
			"--toast-bottom",
			"--chart-7",
			"--avatar-8",
			"--head-bg",
			"--surface-shadow",
			"--bevel-out",
			"--bevel-in",
		])
			expect(tokens, token).toContain(`${token}:`);
		expect(tokens).not.toContain("--map-bg");
	});

	test("applyAppearance sets the attributes and remembers them", () => {
		const dataset = document.documentElement.dataset;
		applyAppearance({ mode: "light", style: "xp", palette: "nether" });
		expect({ ...dataset }).toEqual({
			mode: "light",
			style: "xp",
			palette: "nether",
		});
		// No palette given: left alone.
		applyAppearance({ mode: "dark", style: "modern" });
		expect({ ...dataset }).toEqual({
			mode: "dark",
			style: "modern",
			palette: "nether",
		});
		applyAppearance({ mode: "dark", style: "modern", palette: null });
		expect({ ...dataset }).toEqual({ mode: "dark", style: "modern" });
		expect(appearance.value).toEqual({
			mode: "dark",
			style: "modern",
			palette: null,
		});
	});
});

describe("palette scope", () => {
	test("an element gets the palette with the mode and style in use", () => {
		appearance.value = { mode: "light", palette: "nether", style: "xp" };
		expect(paletteScope("dye-lime")).toEqual({
			"data-palette": "dye-lime",
			"data-mode": "light",
			"data-style": "xp",
		});
		expect(paletteScope(undefined)).toEqual({});
		expect(paletteScope(null)).toEqual({});
	});

	test("without an applied appearance the attributes of <html> are used", () => {
		const dataset = document.documentElement.dataset;
		appearance.value = null;
		delete dataset.mode;
		delete dataset.style;
		expect(paletteScope("end")).toEqual({ "data-palette": "end" });
		dataset.mode = "light";
		dataset.style = "win98";
		expect(paletteScope("end")).toEqual({
			"data-palette": "end",
			"data-mode": "light",
			"data-style": "win98",
		});
		delete dataset.mode;
		delete dataset.style;
	});

	test("it follows the appearance, so what renders it updates on a change", () => {
		appearance.value = { mode: "dark", palette: null, style: "bedrock" };
		const seen: string[] = [];
		const stop = effect(() => {
			const scope = paletteScope("nether");
			seen.push(`${scope["data-mode"]}/${scope["data-style"]}`);
		});
		applyAppearance({ mode: "light", style: "bedrock" });
		applyAppearance({ mode: "light", style: "xp" });
		stop();
		expect(seen).toEqual(["dark/bedrock", "light/bedrock", "light/xp"]);
		appearance.value = null;
	});
});

describe("prefers-color-scheme", () => {
	const original = globalThis.matchMedia;
	afterEach(() => {
		globalThis.matchMedia = original;
	});

	/** A fresh copy of the module, with a matchMedia that records its use. */
	async function load() {
		const log: string[] = [];
		const listeners: ((e: { matches: boolean }) => void)[] = [];
		globalThis.matchMedia = ((query: string) => {
			log.push(query);
			return {
				matches: true,
				addEventListener: (
					_type: string,
					fn: (e: { matches: boolean }) => void,
				) => listeners.push(fn),
			};
		}) as unknown as typeof matchMedia;
		const mod = (await import(
			`./theme.ts?fresh=${Math.random()}`
		)) as typeof import("./theme");
		return { mod, log, listeners };
	}

	test("importing the module does not touch matchMedia; the first read does", async () => {
		const { mod, log, listeners } = await load();
		expect(log).toEqual([]);
		expect(mod.prefersLight.value).toBe(true);
		expect(log).toEqual(["(prefers-color-scheme: light)"]);
		expect(listeners).toHaveLength(1);
		mod.prefersLight.value;
		expect(log).toHaveLength(1);
	});

	test("it follows the system once read", async () => {
		const { mod, listeners } = await load();
		const seen: boolean[] = [];
		const stop = effect(() => {
			seen.push(mod.prefersLight.value);
		});
		listeners[0]?.({ matches: false });
		stop();
		expect(seen).toEqual([true, false]);
	});
});
