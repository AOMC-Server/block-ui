import type { ComponentChildren } from "preact";

/**
 * A label above a control (passed as children), with an optional hint below it. The fields of a
 * form are stacked by the form; `flow` makes a field an ordinary block with a margin of its own,
 * for fields between paragraphs and sections of a page.
 */
export function Field(props: {
	label: string;
	hint?: ComponentChildren;
	flow?: boolean;
	class?: string;
	children: ComponentChildren;
}) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: the control is passed as children
		<label class={`field ${props.flow ? "flow" : ""} ${props.class ?? ""}`}>
			<span class="label">{props.label}</span>
			{props.children}
			{props.hint && <span class="hint">{props.hint}</span>}
		</label>
	);
}
