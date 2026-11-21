export type Cell = string | number;

const csvCell = (v: Cell): string => {
	const s = String(v);
	return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

/** Rows as CSV text: cells with a comma, quote or line break are quoted. Ends with a newline. */
export function toCsv(rows: Cell[][]): string {
	return `${rows.map((r) => r.map(csvCell).join(",")).join("\n")}\n`;
}
