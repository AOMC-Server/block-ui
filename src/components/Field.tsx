import type { ComponentChildren } from "preact";

/** A label above a control (passed as children), with an optional hint below it. */
export function Field(props: {
	label: string;
	hint?: ComponentChildren;
	class?: string;
	children: ComponentChildren;
}) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: the control is passed as children
		<label class={`field ${props.class ?? ""}`}>
			<span class="label">{props.label}</span>
			{props.children}
			{props.hint && <span class="hint">{props.hint}</span>}
		</label>
	);
}
