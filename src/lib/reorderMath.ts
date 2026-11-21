/**
 * Where the dragged item ends up: the number of other items whose middle is above `y`, the middle
 * of the dragged item. `mids` are the middles of all items before the drag started.
 */
export function dropIndex(
	mids: readonly number[],
	from: number,
	y: number,
): number {
	let to = 0;
	mids.forEach((m, i) => {
		if (i !== from && m < y) to++;
	});
	return to;
}

/** Where a dragged item lands in another list: the number of its items whose middle is above `y`. */
export const insertIndex = (mids: readonly number[], y: number): number =>
	mids.filter((m) => m < y).length;
