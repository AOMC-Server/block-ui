import { describe, expect, test } from "bun:test";
import { fontSizeFor, installFontScale } from "./fontScale";

describe("fontSizeFor", () => {
	test("keeps font pixels on whole device pixels", () => {
		for (const dpr of [1, 1.25, 1.5, 1.75, 2, 2.625, 3]) {
			const devicePx = (fontSizeFor(dpr) * dpr) / 12;
			expect(Math.abs(devicePx - Math.round(devicePx))).toBeLessThan(1e-9);
		}
	});

	test("picks the size closest to 18 px", () => {
		expect(fontSizeFor(1)).toBe(24);
		expect(fontSizeFor(1.5)).toBe(16);
		expect(fontSizeFor(2)).toBe(18);
		expect(fontSizeFor(3)).toBe(20);
	});

	test("never goes below one device pixel per font pixel", () => {
		expect(fontSizeFor(0.5)).toBe(24);
	});
});

describe("installFontScale", () => {
	test("sets the property now and on resize, until stopped", () => {
		const el = document.createElement("div");
		const stop = installFontScale(el, "--fs");
		expect(el.style.getPropertyValue("--fs")).toBe(
			`${fontSizeFor(globalThis.devicePixelRatio || 1)}px`,
		);
		el.style.removeProperty("--fs");
		dispatchEvent(new Event("resize"));
		expect(el.style.getPropertyValue("--fs")).not.toBe("");
		stop();
		el.style.removeProperty("--fs");
		dispatchEvent(new Event("resize"));
		expect(el.style.getPropertyValue("--fs")).toBe("");
	});
});
