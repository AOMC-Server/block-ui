import { expect, test } from "bun:test";
import { csvCell, toCsv } from "./csv";

test("escaping", () => {
	expect(csvCell("a,b")).toBe('"a,b"');
	expect(csvCell('say "hi"')).toBe('"say ""hi"""');
	expect(csvCell("two\nlines")).toBe('"two\nlines"');
	expect(csvCell(5)).toBe("5");
	expect(
		toCsv([
			["a", 1],
			["b", 2],
		]),
	).toBe("a,1\nb,2\n");
});
