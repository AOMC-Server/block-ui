import type { ComponentChildren } from "preact";
import { cx } from "../lib/cx";

export type BadgeKind = "ok" | "warn" | "error" | "running";

/** A small status pill. Neutral without a `kind`. */
export function Badge(props: {
	kind?: BadgeKind;
	title?: string;
	children: ComponentChildren;
}) {
	return (
		<span class={cx("badge", props.kind)} title={props.title}>
			{props.children}
		</span>
	);
}

/** A number next to a name. */
export function Count(props: { children: ComponentChildren }) {
	return <span class="count">{props.children}</span>;
}
