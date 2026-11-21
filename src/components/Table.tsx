import type { ComponentChildren } from "preact";
import { cx } from "../lib/cx";

/**
 * A numeric (or any) table header that sorts by its column when clicked. `dir` is the direction
 * the table is sorted in now; the arrow shows on the active column only.
 */
export function SortTh(props: {
	label: ComponentChildren;
	col: string;
	sort: string;
	dir: "asc" | "desc";
	onSort: (col: string) => void;
	/** Right-aligned numeric column. */
	num?: boolean;
	/** Tooltip of the button. */
	hint?: string;
}) {
	const active = props.sort === props.col;
	return (
		<th
			class={props.num ? "num" : undefined}
			aria-sort={
				active ? (props.dir === "asc" ? "ascending" : "descending") : "none"
			}
		>
			<button
				type="button"
				class={cx("plain sort", active && "active")}
				title={props.hint}
				onClick={() => props.onSort(props.col)}
			>
				{props.label}
				{active ? (props.dir === "asc" ? " ▲" : " ▼") : ""}
			</button>
		</th>
	);
}

/** Previous / next buttons for a list that is fetched in pages of `limit` rows. */
export function Pager(props: {
	offset: number;
	limit: number;
	total: number;
	onChange: (offset: number) => void;
}) {
	const { offset, limit, total } = props;
	if (total <= limit) return <div class="pager muted">{total} total</div>;
	const page = Math.floor(offset / limit) + 1;
	const pages = Math.ceil(total / limit);
	return (
		<div class="pager">
			<button
				type="button"
				class="btn small"
				disabled={offset <= 0}
				onClick={() => props.onChange(Math.max(0, offset - limit))}
			>
				Prev
			</button>
			<span class="muted">
				Page {page} of {pages} ({total} total)
			</span>
			<button
				type="button"
				class="btn small"
				disabled={offset + limit >= total}
				onClick={() => props.onChange(offset + limit)}
			>
				Next
			</button>
		</div>
	);
}

/** Makes a clickable table row (`tr.click`) work from the keyboard: Enter or Space runs `fn`. */
export function rowKey(e: KeyboardEvent, fn: () => void) {
	if (e.key === "Enter" || e.key === " ") {
		e.preventDefault();
		fn();
	}
}
