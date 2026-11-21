import { expect, test } from "bun:test";
import { cx } from "./cx";

test("joins the names that are set, with single spaces", () => {
	expect(cx("a", false, "b", undefined, null, "", 0, "c d")).toBe("a b c d");
	expect(cx(false, undefined)).toBe("");
	expect(cx("tabs", true && "center", false && "x")).toBe("tabs center");
});
