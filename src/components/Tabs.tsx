export type TabItem<T extends string> = {
	id: T;
	label: string;
	/** Makes the tab a link (for routes). Clicking calls `onChange` when given, else follows the link. */
	href?: string;
};

/**
 * Page-level tabs. Tabs with an `href` are links; the others are buttons. `onChange` runs on a
 * plain click (not ctrl/cmd/shift-click, which a link keeps for the browser) and, for links,
 * stops the browser from navigating, so a router can take over.
 */
export function Tabs<T extends string>(props: {
	tabs: readonly TabItem<T>[];
	value: T;
	onChange?: (id: T) => void;
	label?: string;
	/** Centre the tray in its container. */
	center?: boolean;
}) {
	return (
		<div
			class={`tabs ${props.center ? "center" : ""}`}
			role="tablist"
			aria-label={props.label}
		>
			{props.tabs.map((t) => {
				const active = t.id === props.value;
				const cls = `plain tab ${active ? "active" : ""}`;
				return t.href !== undefined ? (
					<a
						key={t.id}
						href={t.href}
						role="tab"
						aria-selected={active}
						class={cls}
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
						role="tab"
						aria-selected={active}
						class={cls}
						onClick={() => props.onChange?.(t.id)}
					>
						{t.label}
					</button>
				);
			})}
		</div>
	);
}
