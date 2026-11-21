import type { ComponentChildren } from "preact";

/**
 * A checkbox drawn as a slide toggle (`input.switch`). By default a settings row: the label and
 * its hint on the left, the switch on the right. `inline` puts the switch before the label, with
 * no card around it. Call initToggleDrag() once to let the knob be dragged.
 */
export function Toggle(props: {
	checked: boolean;
	onChange: (checked: boolean) => void;
	label?: ComponentChildren;
	hint?: ComponentChildren;
	disabled?: boolean;
	inline?: boolean;
	/** Extra classes on the label (`danger` for a red row). */
	class?: string;
	/** Accessible name when there is no label. */
	ariaLabel?: string;
}) {
	return (
		<label
			class={`${props.inline ? "check" : "toggle"} ${props.disabled ? "disabled" : ""} ${props.class ?? ""}`}
		>
			<input
				type="checkbox"
				class="switch"
				checked={props.checked}
				disabled={props.disabled}
				aria-label={props.label ? undefined : props.ariaLabel}
				onChange={(e) => props.onChange(e.currentTarget.checked)}
			/>
			{(props.label || props.hint) && (
				<span class="toggle-text">
					{props.label}
					{props.hint && <span class="hint">{props.hint}</span>}
				</span>
			)}
		</label>
	);
}
