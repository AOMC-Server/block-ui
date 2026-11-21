import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { cx } from "../lib/cx";

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
	/** The drag in progress: the pointer, the panel's box when it began, the width so far. */
	const drag = useRef<{
		pointerId: number;
		box: DOMRect;
		latest: number;
	} | null>(null);

	const finish = () => {
		const d = drag.current;
		if (!d) return;
		drag.current = null;
		document.body.classList.remove("resizing");
		onChange(d.latest, true);
	};
	useEffect(
		() => () => {
			if (drag.current) document.body.classList.remove("resizing");
			drag.current = null;
		},
		[],
	);

	const start = (e: PointerEvent) => {
		const handle = e.currentTarget as HTMLElement;
		const panel = handle.parentElement;
		if (e.button !== 0 || !panel) return;
		e.preventDefault();
		handle.setPointerCapture(e.pointerId);
		drag.current = {
			pointerId: e.pointerId,
			box: panel.getBoundingClientRect(),
			latest: width,
		};
		document.body.classList.add("resizing");
	};
	const move = (e: PointerEvent) => {
		const d = drag.current;
		if (!d || e.pointerId !== d.pointerId) return;
		d.latest = Math.min(
			max,
			Math.max(min, right ? e.clientX - d.box.left : d.box.right - e.clientX),
		);
		onChange(d.latest, false);
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
			class={cx("panel-resize", right && "right")}
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize panel"
			aria-valuemin={min}
			aria-valuemax={max}
			aria-valuenow={width}
			tabIndex={0}
			title="Drag to resize (double-click to reset)"
			onPointerDown={start}
			onPointerMove={move}
			onPointerUp={finish}
			onPointerCancel={finish}
			onLostPointerCapture={finish}
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
		<aside class={cx("panel", props.class)} aria-label={props.title}>
			{props.resize && <ResizeHandle {...props.resize} />}
			<header class="panel-head">
				<h2>{props.title}</h2>
				<button
					type="button"
					class={cx("btn small", !props.closeText && "close")}
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
