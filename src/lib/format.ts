/*
 * Formatting helpers. Conventions:
 * - Names start with `format`; the exception is `toYmd`.
 * - Numbers, dates and times follow the user's locale. `toYmd` is always ISO and UTC.
 * - Bytes are binary (1024 per step); `style` picks the labels: IEC ("KiB") or "kb" ("KB").
 * - Durations are given in seconds and come in two forms: `formatDuration` is coarse (two units
 *   at most, minutes at the finest), `formatElapsed` is precise (down to seconds).
 * - A missing value is shown as "-" (or "never" where that is the meaning).
 */

const formats = new Map<string, Intl.NumberFormat>();

/** A cached number format of the user's locale. */
function numberFormat(
	options: Intl.NumberFormatOptions = {},
): Intl.NumberFormat {
	const key = JSON.stringify(options);
	let format = formats.get(key);
	if (!format) {
		format = new Intl.NumberFormat(undefined, options);
		formats.set(key, format);
	}
	return format;
}

const fixed = (digits: number): Intl.NumberFormat =>
	numberFormat({
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
	});

/** A number with grouping and up to three decimals: "12,345.5". */
export const formatNumber = (n: number): string => numberFormat().format(n);

/** A whole number, rounded: "12,345". */
export const formatInt = (n: number): string => fixed(0).format(n);

/** Hours with one decimal: "7,153.2h". */
export const formatHours = (h: number): string => `${fixed(1).format(h)}h`;

/** A fraction as a percentage with one decimal: 0.1234 -> "12.3%". */
export const formatPercent = (fraction: number): string =>
	numberFormat({
		style: "percent",
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
	}).format(fraction);

export type ByteStyle = "iec" | "kb";

const BYTE_UNITS: Record<ByteStyle, readonly string[]> = {
	iec: ["KiB", "MiB", "GiB", "TiB", "PiB"],
	kb: ["KB", "MB", "GB", "TB", "PB"],
};

/**
 * A size in bytes, divided by 1024 per step.
 * - "iec" (default): "512 B", "1.5 KiB", "5.0 MiB"; one decimal below 100, none above.
 * - "kb": "512 B", "2.00 KB", "5.00 MB"; two decimals below 10, one below 100, none above.
 */
export function formatBytes(bytes: number, style: ByteStyle = "iec"): string {
	if (bytes < 1024) return `${formatInt(bytes)} B`;
	const units = BYTE_UNITS[style];
	let value = bytes / 1024;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit++;
	}
	const digits =
		style === "iec"
			? value >= 100
				? 0
				: 1
			: value >= 100
				? 0
				: value >= 10
					? 1
					: 2;
	return `${fixed(digits).format(value)} ${units[unit]}`;
}

/** Coarse: "3d 4h", "3d", "2h 5m", "2h", "7m" (under a minute: "0m"). */
export function formatDuration(seconds: number): string {
	const total = Math.max(0, Math.floor(seconds));
	const d = Math.floor(total / 86400);
	const h = Math.floor((total % 86400) / 3600);
	const m = Math.floor((total % 3600) / 60);
	const unit = (n: number, label: string) => (n > 0 ? ` ${n}${label}` : "");
	if (d > 0) return `${d}d${unit(h, "h")}`;
	if (h > 0) return `${h}h${unit(m, "m")}`;
	return `${m}m`;
}

/** Precise: "1h 05m", "4m 12s", "9s". */
export function formatElapsed(seconds: number): string {
	const s = Math.max(0, Math.round(seconds));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
	if (m > 0) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
	return `${s}s`;
}

/** A job's progress as text: what it is doing, and how far it is where that is known. */
export function formatProgress(
	message: string,
	done?: number | null,
	total?: number | null,
): string {
	return total
		? `${message}: ${formatNumber(done ?? 0)} of ${formatNumber(total)}`
		: `${message}…`;
}

/** A timestamp in milliseconds as date and time in the user's locale. */
export function formatTime(ms: number): string {
	return new Date(ms).toLocaleString(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	});
}

/** A timestamp in milliseconds as a date in the user's locale. */
export function formatDay(ms: number): string {
	return new Date(ms).toLocaleDateString(undefined, { dateStyle: "medium" });
}

/**
 * How long ago a time was: "just now", "30m ago", "3d ago". `time` is a Date or milliseconds;
 * `null` is "never", an invalid time "-", one after `now` "in the future".
 */
export function formatRelative(
	time: Date | number | null | undefined,
	now = Date.now(),
): string {
	if (time === null || time === undefined) return "never";
	const t = typeof time === "number" ? time : time.getTime();
	if (Number.isNaN(t)) return "-";
	const diff = Math.round((now - t) / 1000);
	if (diff < 0) return "in the future";
	if (diff < 45) return "just now";
	if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
	if (diff < 86400 * 60) return `${Math.floor(diff / 86400)}d ago`;
	if (diff < 86400 * 365) return `${Math.floor(diff / (86400 * 30))}mo ago`;
	return `${Math.floor(diff / (86400 * 365))}y ago`;
}

/** "2026-01-02" (UTC) for a Date. */
export const toYmd = (d: Date): string => d.toISOString().slice(0, 10);
