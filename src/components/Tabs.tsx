import { useRef } from "preact/hooks";
import { cx } from "../lib/cx";

export type TabItem<T extends string> = {
	id: T;
	label: string;
	/** Makes the tab a link (for routes). Clicking calls `onChange` when given, else follows the link. */
	href?: string;
};

/**
 * Page-level tabs, in one of two forms:
 * - With `href` on any tab it is navigation: a `<nav>` of links, the current one marked with
 *   `aria-current="page"`. `onChange` runs on a plain click (not ctrl/cmd/shift-click, which a
 *   link keeps for the browser) and stops the browser from navigating, so a router can take over.
 * - Otherwise it is a tab list of buttons: the arrow keys, Home and End move between them (and
 *   select, calling `onChange`), and only the selected one is in the Tab order.
 */
export function Tabs<T extends string>(props: {
	tabs: readonly TabItem<T>[];
	value: T;
	onChange?: (id: T) => void;
	label?: string;
	/** Centre the tray in its container. */
	center?: boolean;
}) {
	const tray = useRef<HTMLDivElement>(null);
	const links = props.tabs.some((t) => t.href !== undefined);
	const cls = cx("tabs", props.center && "center");
	const tabClass = (active: boolean) => cx("plain", "tab", active && "active");

	if (links)
		return (
			<nav class={cls} aria-label={props.label}>
				{props.tabs.map((t) => {
					const active = t.id === props.value;
					return t.href !== undefined ? (
						<a
							key={t.id}
							href={t.href}
							aria-current={active ? "page" : undefined}
							class={tabClass(active)}
							onClick={(e) => {
								if (
									!props.onChange ||
									e.defaultPrevented ||
									e.button !== 0 ||
									e.metaKey ||
									e.ctrlKey ||
									e.shiftKey
								)
									return;
								e.preventDefault();
								props.onChange(t.id);
							}}
						>
							{t.label}
						</a>
					) : (
						<button
							key={t.id}
							type="button"
							aria-current={active ? "page" : undefined}
							class={tabClass(active)}
							onClick={() => props.onChange?.(t.id)}
						>
							{t.label}
						</button>
					);
				})}
			</nav>
		);

	const selected = Math.max(
		0,
		props.tabs.findIndex((t) => t.id === props.value),
	);
	const onKeyDown = (e: KeyboardEvent) => {
		const buttons = [
			...(tray.current?.querySelectorAll<HTMLElement>('[role="tab"]') ?? []),
		];
		const at = buttons.indexOf(e.target as HTMLElement);
		if (at < 0) return;
		const last = buttons.length - 1;
		const to =
			e.key === "ArrowRight"
				? (at + 1) % buttons.length
				: e.key === "ArrowLeft"
					? (at - 1 + buttons.length) % buttons.length
					: e.key === "Home"
						? 0
						: e.key === "End"
							? last
							: -1;
		const next = props.tabs[to];
		if (!next) return;
		e.preventDefault();
		buttons[to]?.focus();
		if (next.id !== props.value) props.onChange?.(next.id);
	};

	return (
		<div
			class={cls}
			role="tablist"
			aria-label={props.label}
			ref={tray}
			onKeyDown={onKeyDown}
		>
			{props.tabs.map((t, i) => {
				const active = t.id === props.value;
				return (
					<button
						key={t.id}
						type="button"
						role="tab"
						aria-selected={active}
						tabIndex={i === selected ? 0 : -1}
						class={tabClass(active)}
						onClick={() => props.onChange?.(t.id)}
					>
						{t.label}
					</button>
				);
			})}
		</div>
	);
}
