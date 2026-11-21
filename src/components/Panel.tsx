import type { ComponentChildren } from "preact";

export type PanelResize = {
	/** The current width in pixels. */
	width: number;
	min: number;
	max: number;
	/** The width changed; `commit` is false while dragging and true when it is final (save it then). */
	onChange: (width: number, commit: boolean) => void;
	/** Back to the default width (double-click on the handle). */
	onReset: () => void;
	/** Which edge of the panel carries the handle. Default "left", for a panel docked to the right. */
	edge?: "left" | "right";
};

/** The edge of the panel, dragged (or moved with the arrow keys) to change its width. */
function ResizeHandle(props: PanelResize) {
	const { width, min, max, onChange } = props;
	const right = props.edge === "right";
	const drag = (e: PointerEvent) => {
		const panel = (e.currentTarget as HTMLElement).parentElement;
		if (e.button !== 0 || !panel) return;
		e.preventDefault();
		const box = panel.getBoundingClientRect();
		let latest = width;
		const move = (m: PointerEvent) => {
			latest = Math.min(
				max,
				Math.max(min, right ? m.clientX - box.left : box.right - m.clientX),
			);
			onChange(latest, false);
		};
		const done = () => {
			removeEventListener("pointermove", move);
			removeEventListener("pointerup", done);
			removeEventListener("pointercancel", done);
			document.body.classList.remove("resizing");
			onChange(latest, true);
		};
		addEventListener("pointermove", move);
		addEventListener("pointerup", done);
		addEventListener("pointercancel", done);
		document.body.classList.add("resizing");
	};
	const key = (e: KeyboardEvent) => {
		const step = (e.shiftKey ? 80 : 20) * (right ? -1 : 1);
		const next: Record<string, number> = {
			ArrowLeft: width + step,
			ArrowRight: width - step,
			Home: max,
			End: min,
		};
		if (!(e.key in next)) return;
		e.preventDefault();
		e.stopPropagation();
		onChange(Math.min(max, Math.max(min, next[e.key] as number)), true);
	};
	return (
		// biome-ignore lint/a11y/useSemanticElements: a focusable splitter, which <hr> cannot be
		<div
			class={`panel-resize ${right ? "right" : ""}`}
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize panel"
			aria-valuemin={min}
			aria-valuemax={max}
			aria-valuenow={width}
			tabIndex={0}
			title="Drag to resize (double-click to reset)"
			onPointerDown={drag}
			onDblClick={props.onReset}
			onKeyDown={key}
		/>
	);
}

/**
 * A window with a title bar and a close button, a scrolling body and an optional footer. It has
 * no position of its own: place and size it from the app (`position`, `width`). With `resize`,
 * an edge becomes a handle; see createWidthStore for a ready-made store for the width.
 */
export function Panel(props: {
	title: string;
	onClose: () => void;
	/** Text for the close button instead of "×". */
	closeText?: string;
	class?: string;
	/** Rendered between the title bar and the body (tab strips). */
	tabs?: ComponentChildren;
	footer?: ComponentChildren;
	resize?: PanelResize;
	children: ComponentChildren;
}) {
	return (
		<aside class={`panel ${props.class ?? ""}`} aria-label={props.title}>
			{props.resize && <ResizeHandle {...props.resize} />}
			<header class="panel-head">
				<h2>{props.title}</h2>
				<button
					type="button"
					class={`btn small ${props.closeText ? "" : "close"}`}
					aria-label="Close"
					onClick={props.onClose}
				>
					{props.closeText ?? "×"}
				</button>
			</header>
			{props.tabs}
			<div class="panel-body">{props.children}</div>
			{props.footer && <footer class="panel-foot">{props.footer}</footer>}
		</aside>
	);
}
