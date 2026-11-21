import { describe, expect, test } from "bun:test";
import {
	formatBytes,
	formatDuration,
	formatElapsed,
	formatHours,
	formatInt,
	formatNumber,
	formatPercent,
	formatProgress,
	formatRelative,
	toYmd,
} from "./format";

/** The same number, grouped the way the user's locale does. */
const grouped = (n: number, digits = 0) =>
	n.toLocaleString(undefined, {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
	});

describe("formatBytes", () => {
	test("binary with IEC labels by default", () => {
		expect(formatBytes(512)).toBe("512 B");
		expect(formatBytes(1536)).toBe(`${grouped(1.5, 1)} KiB`);
		expect(formatBytes(5 * 1024 * 1024)).toBe(`${grouped(5, 1)} MiB`);
		expect(formatBytes(150 * 1024)).toBe("150 KiB");
	});

	test("the kb style has KB labels and more decimals", () => {
		expect(formatBytes(512, "kb")).toBe("512 B");
		expect(formatBytes(2048, "kb")).toBe(`${grouped(2, 2)} KB`);
		expect(formatBytes(5 * 1024 * 1024, "kb")).toBe(`${grouped(5, 2)} MB`);
		expect(formatBytes(3 * 1024 ** 3, "kb")).toBe(`${grouped(3, 2)} GB`);
		expect(formatBytes(150 * 1024, "kb")).toBe("150 KB");
		expect(formatBytes(15 * 1024, "kb")).toBe(`${grouped(15, 1)} KB`);
	});
});

describe("numbers", () => {
	test("hours, percent, int, number follow the user's locale", () => {
		expect(formatHours(7153.24)).toBe(`${grouped(7153.2, 1)}h`);
		expect(formatHours(0)).toBe(`${grouped(0, 1)}h`);
		expect(formatPercent(0.1234)).toBe(
			(0.1234).toLocaleString(undefined, {
				style: "percent",
				minimumFractionDigits: 1,
				maximumFractionDigits: 1,
			}),
		);
		expect(formatInt(1234567.8)).toBe(grouped(1234568));
		expect(formatNumber(5)).toBe("5");
		expect(formatNumber(12345.5)).toBe((12345.5).toLocaleString());
	});
});

describe("durations", () => {
	test("elapsed (precise) has seconds", () => {
		expect(formatElapsed(9)).toBe("9s");
		expect(formatElapsed(252)).toBe("4m 12s");
		expect(formatElapsed(3900)).toBe("1h 05m");
		expect(formatElapsed(-4)).toBe("0s");
	});

	test("duration (coarse) has two units at most and drops a zero one", () => {
		expect(formatDuration(59)).toBe("0m");
		expect(formatDuration(420)).toBe("7m");
		expect(formatDuration(3900)).toBe("1h 5m");
		expect(formatDuration(3 * 3600)).toBe("3h");
		expect(formatDuration(90000)).toBe("1d 1h");
		expect(formatDuration(3 * 86400)).toBe("3d");
		expect(formatDuration(-5)).toBe("0m");
	});

	test("progress", () => {
		expect(formatProgress("Reading")).toBe("Reading…");
		expect(formatProgress("Reading", 5, 1000)).toBe(
			`Reading: 5 of ${grouped(1000)}`,
		);
	});
});

describe("dates", () => {
	test("toYmd is UTC", () => {
		expect(toYmd(new Date("2026-01-02T23:00:00Z"))).toBe("2026-01-02");
	});

	test("relative takes a Date or milliseconds", () => {
		const now = Date.UTC(2026, 0, 2, 12);
		const ago = (seconds: number) => now - seconds * 1000;
		expect(formatRelative(null, now)).toBe("never");
		expect(formatRelative(undefined, now)).toBe("never");
		expect(formatRelative(ago(10), now)).toBe("just now");
		expect(formatRelative(new Date(ago(30 * 60)), now)).toBe("30m ago");
		expect(formatRelative(ago(6 * 3600), now)).toBe("6h ago");
		expect(formatRelative(ago(3 * 86400), now)).toBe("3d ago");
		expect(formatRelative(ago(212 * 86400), now)).toBe("7mo ago");
		expect(formatRelative(ago(3 * 365 * 86400), now)).toBe("3y ago");
		expect(formatRelative(now + 86400_000, now)).toBe("in the future");
		expect(formatRelative(Number.NaN, now)).toBe("-");
	});
});
