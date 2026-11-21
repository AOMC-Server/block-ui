import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createWidthStore } from "./widthStore";

beforeEach(() => {
	localStorage.clear();
	(
		window as unknown as {
			happyDOM: { setViewport(v: { width: number; height: number }): void };
		}
	).happyDOM.setViewport({ width: 1400, height: 800 });
});

afterEach(() => {
	document.documentElement.removeAttribute("style");
});

const options = {
	key: "w",
	min: 320,
	max: (w: number) => Math.min(w - 16, w * 0.7, 900),
	default: 400,
};

describe("createWidthStore", () => {
	test("is kept between the minimum and most of the window", () => {
		const s = createWidthStore(options);
		expect(s.clamp(100, 1400)).toBe(320);
		expect(s.clamp(500, 1400)).toBe(500);
		expect(s.clamp(5000, 1400)).toBe(900);
		expect(s.clamp(5000, 1000)).toBe(700);
		// A narrow window still gets the minimum.
		expect(s.clamp(500, 340)).toBe(320);
	});

	test("a fixed maximum works too", () => {
		const s = createWidthStore({ ...options, max: 600 });
		expect(s.max(5000)).toBe(600);
		expect(s.clamp(1000, 5000)).toBe(600);
	});

	test("starts from the saved width, or the default", () => {
		localStorage.setItem("w", "512");
		expect(createWidthStore(options).width.value).toBe(512);
		localStorage.setItem("w", "10");
		expect(createWidthStore(options).width.value).toBe(320);
		// A saved width from a wider window is brought back inside the maximum.
		localStorage.setItem("w", "5000");
		expect(createWidthStore(options).width.value).toBe(900);
		localStorage.setItem("w", "5000");
		expect(createWidthStore({ ...options, max: 600 }).width.value).toBe(600);
		localStorage.setItem("w", "400.6");
		expect(createWidthStore(options).width.value).toBe(401);
		localStorage.setItem("w", "junk");
		expect(createWidthStore(options).width.value).toBe(400);
		localStorage.clear();
		expect(createWidthStore(options).width.value).toBe(400);
	});

	test("set saves unless told not to, reset forgets", () => {
		const s = createWidthStore(options);
		s.set(480, false);
		expect(s.width.value).toBe(480);
		expect(localStorage.getItem("w")).toBeNull();
		s.set(5000);
		expect(s.width.value).toBe(900);
		expect(localStorage.getItem("w")).toBe("900");
		s.reset();
		expect(s.width.value).toBe(400);
		expect(localStorage.getItem("w")).toBeNull();
	});

	test("mirrors the width in a css variable", () => {
		const style = document.documentElement.style;
		const s = createWidthStore({
			...options,
			cssVar: "--panel-w",
			cssValue: (w) => `min(${w}px, calc(100vw - 16px))`,
		});
		expect(style.getPropertyValue("--panel-w")).toBe(
			"min(400px, calc(100vw - 16px))",
		);
		s.set(600);
		expect(style.getPropertyValue("--panel-w")).toBe(
			"min(600px, calc(100vw - 16px))",
		);
		s.dispose();
		s.set(500);
		expect(style.getPropertyValue("--panel-w")).toBe(
			"min(600px, calc(100vw - 16px))",
		);
	});
});
