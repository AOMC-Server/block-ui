import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as {
	exports: Record<string, string | { types?: string; default: string }>;
};
const target = (key: string) => {
	const e = pkg.exports[key];
	return typeof e === "string" ? e : e?.default;
};

/** The relative modules a file imports, transitively (static imports and re-exports). */
function reach(file: string, seen = new Set<string>()): Set<string> {
	if (seen.has(file)) return seen;
	seen.add(file);
	const src = readFileSync(file, "utf8");
	for (const m of src.matchAll(/(?:from|import)\s+["'](\.[^"']+)["']/g)) {
		const base = resolve(dirname(file), m[1] as string);
		const found = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find(
			(f) => existsSync(f) && /\.tsx?$/.test(f),
		);
		if (found) reach(found, seen);
	}
	return seen;
}

describe("package exports", () => {
	test("every export points at a file", () => {
		for (const key of Object.keys(pkg.exports)) {
			if (key.includes("*")) continue;
			expect(existsSync(resolve(root, target(key) ?? "")), key).toBe(true);
		}
	});

	test("the css export has types, so importing it type-checks without a shim", () => {
		const css = pkg.exports["./css"];
		expect(typeof css).toBe("object");
		const types = (css as { types?: string }).types ?? "";
		expect(types.endsWith(".d.ts")).toBe(true);
		expect(existsSync(resolve(root, types))).toBe(true);
		// `types` is matched first.
		expect(Object.keys(css as object)[0]).toBe("types");
		expect((css as { default: string }).default.endsWith(".css")).toBe(true);
	});

	test("the pure modules have subpaths that pull in no TSX", () => {
		for (const key of [
			"./width",
			"./reorder",
			"./markdown",
			"./menu",
			"./events",
			"./format",
			"./csv",
			"./errors",
			"./hooks",
			"./theme",
		]) {
			const file = resolve(root, target(key) ?? "");
			expect(existsSync(file), key).toBe(true);
			const tsx = [...reach(file)].filter((f) => f.endsWith(".tsx"));
			expect(tsx, key).toEqual([]);
		}
	});

	test("the main entry does include components", () => {
		const tsx = [...reach(resolve(root, target(".") ?? ""))].filter((f) =>
			f.endsWith(".tsx"),
		);
		expect(tsx.length).toBeGreaterThan(5);
	});
});
