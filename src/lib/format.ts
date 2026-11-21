/*
 * Formatting helpers shared by the apps. Names all start with `format` except the parsers.
 *
 * Two conventions existed for some of them, and both are kept, under different names or options:
 * - bytes: `formatBytes(n)` is binary with IEC labels ("1.5 KiB"); `formatBytes(n, "kb")` is
 *   also binary (1024) but labelled "KB"/"MB" with more decimals ("2.00 KB").
 * - durations: `formatDuration` is coarse (days/hours/minutes), `formatElapsed` is precise
 *   (hours/minutes/seconds).
 */

const MINUTE = 60_000;

const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("en-US", {
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
});

/** A number in the user's locale ("12,345" or "12.345"). */
export const formatNumber = (n: number): string => n.toLocaleString();

/** A whole number, always in en-US grouping ("12,345"). */
export const formatInt = (n: number): string => nf0.format(n);

/** Hours with one decimal: "7,153.2h". */
export const formatHours = (h: number): string => `${nf1.format(h)}h`;

export const secsToHours = (secs: number): number => secs / 3600;

/** A fraction as a percentage with one decimal: 0.1234 -> "12.3%". */
export const formatPercent = (fraction: number): string =>
	`${(fraction * 100).toFixed(1)}%`;

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
	if (bytes < 1024) return `${bytes} B`;
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
	return `${value.toFixed(digits)} ${units[unit]}`;
}

/** Coarse: "3d 4h", "2h 5m", "7m". */
export function formatDuration(seconds: number): string {
	const d = Math.floor(seconds / 86400);
	const h = Math.floor((seconds % 86400) / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	if (d > 0) return `${d}d ${h}h`;
	if (h > 0) return `${h}h ${m}m`;
	return `${m}m`;
}

/** Precise: "1h 05m", "4m 12s", "9s". */
export function formatElapsed(secs: number): string {
	const s = Math.max(0, Math.round(secs));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
	if (m > 0) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
	return `${s}s`;
}

/** "3h", "25m": how long until `ms` from now, roughly. */
export function formatRemaining(ms: number): string {
	const minutes = Math.max(Math.ceil(ms / MINUTE), 1);
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	if (hours < 48) return `${hours}h`;
	return `${Math.floor(hours / 24)}d`;
}

/** "45 s", "3 min 20 s", "1 h 5 min": how long something still takes, for estimates. */
export function formatEta(seconds: number): string {
	const total = Math.max(1, Math.ceil(seconds));
	if (total < 60) return `${total} s`;
	const m = Math.floor(total / 60);
	if (m < 10) return `${m} min ${total % 60} s`;
	if (m < 60) return `${m} min`;
	return `${Math.floor(m / 60)} h ${m % 60} min`;
}

/** A job's progress as text: what it is doing, and how far it is where that is known. */
export function formatProgress(
	message: string,
	done?: number | null,
	total?: number | null,
): string {
	return total
		? `${message}: ${(done ?? 0).toLocaleString()} of ${total.toLocaleString()}`
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

/** Parses "YYYY-MM-DD HH:MM:SS.mmm" (UTC) or an ISO string. */
export function parseTs(ts: string): Date {
	if (/[zZ]|[+-]\d\d:?\d\d$/.test(ts)) return new Date(ts);
	return new Date(`${ts.replace(" ", "T")}Z`);
}

/** "2026-01-02 03:04" from a log timestamp. */
export const formatShortTs = (ts: string | null): string =>
	ts ? ts.slice(0, 16) : "-";

/** "2026-01-02" from a log timestamp. */
export const formatShortDate = (ts: string | null): string =>
	ts ? ts.slice(0, 10) : "-";

/** "just now", "30m ago", "3d ago" for a timestamp that `parseTs` understands. */
export function formatRelative(ts: string | null, now = Date.now()): string {
	if (!ts) return "never";
	const t = parseTs(ts).getTime();
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
