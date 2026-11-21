import { describe, expect, test } from "bun:test";
import {
	formatBytes,
	formatDuration,
	formatElapsed,
	formatEta,
	formatHours,
	formatInt,
	formatNumber,
	formatPercent,
	formatProgress,
	formatRelative,
	formatRemaining,
	formatShortDate,
	formatShortTs,
	parseTs,
	secsToHours,
	toYmd,
} from "./format";

describe("formatBytes", () => {
	test("binary with IEC labels by default", () => {
		expect(formatBytes(512)).toBe("512 B");
		expect(formatBytes(1536)).toBe("1.5 KiB");
		expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MiB");
		expect(formatBytes(150 * 1024)).toBe("150 KiB");
	});

	test("the kb style keeps blockmap's labels and decimals", () => {
		expect(formatBytes(512, "kb")).toBe("512 B");
		expect(formatBytes(2048, "kb")).toBe("2.00 KB");
		expect(formatBytes(5 * 1024 * 1024, "kb")).toBe("5.00 MB");
		expect(formatBytes(3 * 1024 ** 3, "kb")).toBe("3.00 GB");
		expect(formatBytes(150 * 1024, "kb")).toBe("150 KB");
		expect(formatBytes(15 * 1024, "kb")).toBe("15.0 KB");
	});
});

describe("formatEta", () => {
	test("seconds, then minutes, then hours", () => {
		expect(formatEta(0.2)).toBe("1 s");
		expect(formatEta(44.1)).toBe("45 s");
		expect(formatEta(200)).toBe("3 min 20 s");
		expect(formatEta(1500)).toBe("25 min");
		expect(formatEta(3900)).toBe("1 h 5 min");
	});
});

describe("numbers", () => {
	test("hours, percent, int", () => {
		expect(formatHours(7153.24)).toBe("7,153.2h");
		expect(formatHours(0)).toBe("0.0h");
		expect(formatPercent(0.1234)).toBe("12.3%");
		expect(formatInt(1234567.8)).toBe("1,234,568");
		expect(secsToHours(7200)).toBe(2);
		expect(formatNumber(5)).toBe("5");
	});
});

describe("durations", () => {
	test("elapsed has seconds", () => {
		expect(formatElapsed(9)).toBe("9s");
		expect(formatElapsed(252)).toBe("4m 12s");
		expect(formatElapsed(3900)).toBe("1h 05m");
		expect(formatElapsed(-4)).toBe("0s");
	});

	test("duration is coarse", () => {
		expect(formatDuration(59)).toBe("0m");
		expect(formatDuration(3900)).toBe("1h 5m");
		expect(formatDuration(90000)).toBe("1d 1h");
	});

	test("remaining rounds up and picks one unit", () => {
		expect(formatRemaining(1)).toBe("1m");
		expect(formatRemaining(25 * 60_000)).toBe("25m");
		expect(formatRemaining(3 * 3600_000)).toBe("3h");
		expect(formatRemaining(72 * 3600_000)).toBe("3d");
	});

	test("progress", () => {
		expect(formatProgress("Reading")).toBe("Reading…");
		expect(formatProgress("Reading", 5, 1000)).toBe("Reading: 5 of 1,000");
	});
});

describe("timestamps", () => {
	test("parseTs handles log and ISO forms", () => {
		expect(parseTs("2026-01-02 03:04:05.000").toISOString()).toBe(
			"2026-01-02T03:04:05.000Z",
		);
		expect(parseTs("2026-01-02T03:04:05.000Z").getTime()).toBe(
			parseTs("2026-01-02 03:04:05.000").getTime(),
		);
	});

	test("short forms", () => {
		expect(formatShortTs("2026-01-02 03:04:05.000")).toBe("2026-01-02 03:04");
		expect(formatShortDate("2026-01-02 03:04:05.000")).toBe("2026-01-02");
		expect(formatShortTs(null)).toBe("-");
		expect(toYmd(new Date("2026-01-02T23:00:00Z"))).toBe("2026-01-02");
	});

	test("relative", () => {
		const now = parseTs("2026-01-02 12:00:00.000").getTime();
		expect(formatRelative(null, now)).toBe("never");
		expect(formatRelative("2026-01-02 11:59:50.000", now)).toBe("just now");
		expect(formatRelative("2026-01-02 11:30:00.000", now)).toBe("30m ago");
		expect(formatRelative("2026-01-02 06:00:00.000", now)).toBe("6h ago");
		expect(formatRelative("2025-12-30 12:00:00.000", now)).toBe("3d ago");
		expect(formatRelative("2025-06-02 12:00:00.000", now)).toBe("7mo ago");
		expect(formatRelative("2023-01-02 12:00:00.000", now)).toBe("3y ago");
		expect(formatRelative("2026-01-03 12:00:00.000", now)).toBe(
			"in the future",
		);
	});
});
