/**
 * Up and Down move between the items of a menu, like a native one: call it from the menu's
 * keydown handler. Wraps around; with nothing focused yet, Down picks the first item and Up the
 * last. Disabled items are skipped.
 */
export function moveFocus(
	menu: HTMLElement,
	step: 1 | -1,
	itemSelector = "button.menu-item:not(:disabled)",
) {
	const items = [...menu.querySelectorAll<HTMLElement>(itemSelector)];
	if (items.length === 0) return;
	const at = items.indexOf(document.activeElement as HTMLElement);
	const next =
		at < 0
			? step > 0
				? 0
				: items.length - 1
			: (at + step + items.length) % items.length;
	items[next]?.focus();
}
