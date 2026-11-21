import type { ComponentChildren } from "preact";
import { useId, useLayoutEffect, useRef } from "preact/hooks";
import { cx } from "../lib/cx";

/**
 * A label above a control (passed as children), with an optional hint below it. The hint is
 * outside the label, so it does not become part of the control's name; it is linked to the
 * control with `aria-describedby` instead. The fields of a form are stacked by the form; `flow`
 * makes a field an ordinary block with a margin of its own, for fields between paragraphs and
 * sections of a page.
 */
export function Field(props: {
	label: string;
	hint?: ComponentChildren;
	flow?: boolean;
	class?: string;
	children: ComponentChildren;
}) {
	const hintId = useId();
	const label = useRef<HTMLLabelElement>(null);
	const hasHint = Boolean(props.hint);

	// The control is whatever the caller passed, so it is found in the DOM, and again after
	// every render in case it was replaced.
	useLayoutEffect(() => {
		const control = label.current?.querySelector<HTMLElement>(
			"input:not([type=hidden]), select, textarea, button, [contenteditable]",
		);
		if (!control) return;
		const ids = (control.getAttribute("aria-describedby") ?? "")
			.split(/\s+/)
			.filter((id) => id && id !== hintId);
		if (hasHint) ids.push(hintId);
		if (ids.length > 0) control.setAttribute("aria-describedby", ids.join(" "));
		else control.removeAttribute("aria-describedby");
	});

	return (
		<div class={cx("field", props.flow && "flow", props.class)}>
			{/* biome-ignore lint/a11y/noLabelWithoutControl: the control is passed as children */}
			<label class="field-control" ref={label}>
				<span class="label">{props.label}</span>
				{props.children}
			</label>
			{hasHint && (
				<span class="hint" id={hintId}>
					{props.hint}
				</span>
			)}
		</div>
	);
}
