import type { ComponentChildren } from "preact";

export type BadgeKind = "ok" | "warn" | "error" | "running";

/** A small status pill. Neutral without a `kind`. */
export function Badge(props: {
	kind?: BadgeKind;
	title?: string;
	children: ComponentChildren;
}) {
	return (
		<span class={`badge ${props.kind ?? ""}`} title={props.title}>
			{props.children}
		</span>
	);
}

/** A number next to a name. */
export function Count(props: { children: ComponentChildren }) {
	return <span class="count">{props.children}</span>;
}
