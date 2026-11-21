import { useLayoutEffect, useRef } from "preact/hooks";
import { type CrossDrop, startReorder } from "../lib/reorder";

/** How long after a key move the row may still take the focus back (the list may re-render later). */
const REFOCUS_MS = 1000;

/** The row that should get the focus once it has rendered in its new place. */
let refocus: { id: string; until: number } | null = null;

/**
 * The handle of a list row that can be reordered: drag it, or focus it and press the up and down
 * arrow keys. `id` identifies the row so that focus can go back to it after the list re-renders,
 * even when the row is re-created in its new place.
 */
export function Grip(props: {
	id: string;
	label: string;
	index: number;
	count: number;
	onMove: (from: number, to: number) => void;
	/** Lets the row also be dropped on other lists (`data-drop-target`). */
	cross?: CrossDrop;
	/** The row to move, found from the handle: `closest(itemSelector)`. Default "li". */
	itemSelector?: string;
}) {
	const { id, index, count, onMove } = props;
	const button = useRef<HTMLButtonElement>(null);

	useLayoutEffect(() => {
		if (refocus?.id !== id) return;
		const wanted = refocus.until > Date.now();
		refocus = null;
		if (wanted) button.current?.focus();
	});

	return (
		<button
			type="button"
			class="plain grip"
			data-grip={id}
			ref={button}
			aria-label={`Move ${props.label}`}
			title={
				props.cross
					? "Drag to reorder or to move to another list, or press the up and down arrow keys"
					: "Drag to reorder, or press the up and down arrow keys"
			}
			onPointerDown={(e) => {
				const item = e.currentTarget.closest<HTMLElement>(
					props.itemSelector ?? "li",
				);
				if (e.button === 0 && item)
					startReorder(e, e.currentTarget, item, onMove, props.cross);
			}}
			onKeyDown={(e) => {
				const to =
					e.key === "ArrowUp"
						? index - 1
						: e.key === "ArrowDown"
							? index + 1
							: -1;
				if (to < 0 || to >= count) return;
				e.preventDefault();
				e.stopPropagation();
				refocus = { id, until: Date.now() + REFOCUS_MS };
				onMove(index, to);
			}}
		>
			<span class="grip-dots" aria-hidden="true" />
		</button>
	);
}
