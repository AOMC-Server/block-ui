/** Joins the class names that are set, skipping the empty ones: no double or trailing spaces. */
export const cx = (...parts: unknown[]): string =>
	parts.filter((p) => typeof p === "string" && p !== "").join(" ");
