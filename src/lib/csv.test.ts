import { expect, test } from "bun:test";
import { toCsv } from "./csv";

test("cells are quoted when they need it", () => {
	expect(toCsv([["a,b", 'say "hi"', "two\nlines", 5]])).toBe(
		'"a,b","say ""hi""","two\nlines",5\n',
	);
	expect(
		toCsv([
			["a", 1],
			["b", 2],
		]),
	).toBe("a,1\nb,2\n");
});
