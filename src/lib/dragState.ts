/** Pointer drags in progress (list reordering), so that other handlers can leave Escape to them. */
let active = 0;

/** Marks a drag as started. Returns a function that marks it as ended (safe to call twice). */
export function beginDrag(): () => void {
	let ended = false;
	active++;
	return () => {
		if (ended) return;
		ended = true;
		active--;
	};
}

export const isDragging = (): boolean => active > 0;
