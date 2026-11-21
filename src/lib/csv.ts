export type Cell = string | number;

export function csvCell(v: Cell): string {
	const s = String(v);
	return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function toCsv(rows: Cell[][]): string {
	return `${rows.map((r) => r.map(csvCell).join(",")).join("\n")}\n`;
}
