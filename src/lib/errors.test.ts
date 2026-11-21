import { expect, test } from "bun:test";
import { failureMessage } from "./errors";

test("shows the first validation issue with its path", () => {
	expect(
		failureMessage(400, {
			error: "invalid request",
			issues: [
				{ path: ["geometry", 0], message: "too big" },
				{ path: ["name"], message: "too long" },
			],
		}),
	).toBe("geometry.0: too big");
});

test("an issue without a path is just its message", () => {
	expect(
		failureMessage(400, {
			error: "invalid request",
			issues: [{ path: [], message: "nothing to update" }],
		}),
	).toBe("nothing to update");
});

test("rate limits and oversized requests get friendly messages", () => {
	expect(failureMessage(429, { error: "slow down" })).toMatch(
		/Too many requests/,
	);
	expect(failureMessage(413, { error: "request body too large" })).toMatch(
		/too large/,
	);
});

test("falls back to the server's error, then the status", () => {
	expect(failureMessage(404, { error: "not found" })).toBe("not found");
	expect(failureMessage(500, null)).toBe("Request failed (500)");
});
