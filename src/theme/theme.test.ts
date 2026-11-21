import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
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

	test("without an applied appearance only the palette is set", () => {
		appearance.value = null;
		expect(paletteScope("end")).toEqual({ "data-palette": "end" });
	});
});
