import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { type PrepaintOptions, prepaintScript } from "./prepaint";
import { STYLES } from "./theme";

/** Runs the script like a browser would: against a fake <html>, storage and media query. */
function run(
	opts: PrepaintOptions,
	stored: Record<string, string>,
	light = false,
	location: Partial<Location> = { pathname: "/", search: "" },
) {
	const dataset: Record<string, string> = {};
	const storage = { getItem: (k: string) => stored[k] ?? null };
	new Function(
		"document",
		"localStorage",
		"matchMedia",
		"location",
		prepaintScript(opts),
	)(
		{ documentElement: { dataset } },
		storage,
		() => ({ matches: light }),
		location,
	);
	return dataset;
}

describe("prepaintScript", () => {
	test("defaults to dark and bedrock when nothing is saved", () => {
		expect(run({}, {})).toEqual({ mode: "dark", style: "bedrock" });
	});

	test("applies a saved mode, style and palette from the default key", () => {
		const saved = { mode: "light", style: "xp", palette: "nether" };
		expect(run({}, { "block-ui.appearance": JSON.stringify(saved) })).toEqual(
			saved,
		);
	});

	test("system follows the media query", () => {
		const stored = {
			"block-ui.appearance": JSON.stringify({ mode: "system" }),
		};
		expect(run({}, stored, true).mode).toBe("light");
		expect(run({}, stored, false).mode).toBe("dark");
	});

	test("ignores invalid values and broken JSON", () => {
		const bad = JSON.stringify({ mode: "dim", style: "vista", palette: 3 });
		expect(run({}, { "block-ui.appearance": bad })).toEqual({
			mode: "dark",
			style: "bedrock",
		});
		expect(run({}, { "block-ui.appearance": "{nope" })).toEqual({
			mode: "dark",
			style: "bedrock",
		});
	});

	test("palettes can be limited to a list", () => {
		const opts = { palettes: ["overworld", "nether"] };
		const key = (palette: string) => ({
			"block-ui.appearance": JSON.stringify({ palette }),
		});
		expect(run(opts, key("nether")).palette).toBe("nether");
		expect(run(opts, key("end")).palette).toBeUndefined();
	});

	test("a custom key, reader and defaults", () => {
		const opts: PrepaintOptions = {
			storageKey: "app.settings",
			defaults: { mode: "light", style: "modern", palette: "overworld" },
			palettes: ["overworld", "nether"],
			// Maps the app's own settings, and looks at the page like blockmap does.
			reader: (s, ctx) =>
				s && {
					mode: s.mode,
					style: s.style,
					palette: ctx.location.pathname === "/" ? "nether" : undefined,
				},
		};
		expect(run(opts, {})).toEqual({
			mode: "light",
			style: "modern",
			palette: "overworld",
		});
		const stored = {
			"app.settings": JSON.stringify({ mode: "dark", style: "xp" }),
		};
		expect(run(opts, stored)).toEqual({
			mode: "dark",
			style: "xp",
			palette: "nether",
		});
		expect(
			run(opts, stored, false, { pathname: "/settings", search: "" }),
		).toEqual({ mode: "dark", style: "xp", palette: "overworld" });
	});

	test("knows the same styles as the theme", () => {
		const src = prepaintScript();
		const list = JSON.parse(
			/const STYLES = (\[[^\]]*\])/.exec(src)?.[1] ?? "null",
		);
		expect(list).toEqual(STYLES.map((s) => s.id));
	});

	test("the README snippet is the output of prepaintScript()", () => {
		const readme = readFileSync(
			new URL("../../README.md", import.meta.url),
			"utf8",
		);
		expect(readme).toContain(prepaintScript());
	});
});
