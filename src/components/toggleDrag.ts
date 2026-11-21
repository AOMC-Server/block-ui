/**
 * Lets the knob of a slide toggle (`input.switch`) be dragged: it follows the pointer, and on
 * release the toggle takes the side the knob is nearer. A press that does not move is still an
 * ordinary click.
 */

/** How far (css px) the pointer has to move before a press becomes a drag. */
const DRAG_START_PX = 4;

type Drag = {
	input: HTMLInputElement;
	pointerId: number;
	startX: number;
	/** How far the knob can move, from off to on. */
	travel: number;
	/** Where the knob was when the press started: 0 (off) to `travel` (on). */
	from: number;
	at: number;
	dragging: boolean;
};

let drag: Drag | null = null;

/** Removes the click swallower of the last drag, if it is still waiting for its click. */
let releaseClick: (() => void) | null = null;

/** The swallower waits at most this long (ms) for a click that may never come (touch). */
const SWALLOW_MAX_MS = 500;

function knobTravel(input: HTMLInputElement): number {
	const knob = Number.parseFloat(getComputedStyle(input, "::before").width);
	return Math.max(0, input.getBoundingClientRect().width - (knob || 0));
}

function setChecked(input: HTMLInputElement, checked: boolean) {
	if (input.checked === checked) return;
	input.checked = checked;
	input.dispatchEvent(new Event("input", { bubbles: true }));
	input.dispatchEvent(new Event("change", { bubbles: true }));
}

function end(e: PointerEvent, cancelled: boolean) {
	if (!drag || e.pointerId !== drag.pointerId) return;
	const { input, dragging, at, travel } = drag;
	drag = null;
	if (!dragging) return;
	input.classList.remove("knob-drag");
	input.style.removeProperty("--knob-x");
	if (cancelled) return;
	setChecked(input, at > travel / 2);
	// The click that follows the release would toggle it again.
	releaseClick?.();
	const swallow = (c: MouseEvent) => {
		c.preventDefault();
		c.stopPropagation();
		release();
	};
	const timer = setTimeout(() => release(), SWALLOW_MAX_MS);
	const release = () => {
		clearTimeout(timer);
		window.removeEventListener("click", swallow, true);
		if (releaseClick === release) releaseClick = null;
	};
	releaseClick = release;
	window.addEventListener("click", swallow, true);
}

/**
 * Starts listening (once for the whole document). `selector` says which checkboxes are slide
 * toggles. Returns a function that stops it.
 */
export function initToggleDrag(selector = "input.switch"): () => void {
	const down = (e: PointerEvent) => {
		// A new press: whatever click the last drag was waiting for is not coming.
		releaseClick?.();
		const input = e.target;
		if (
			!(input instanceof HTMLInputElement) ||
			input.type !== "checkbox" ||
			!input.matches(selector) ||
			input.disabled ||
			(e.pointerType === "mouse" && e.button !== 0)
		)
			return;
		const travel = knobTravel(input);
		const from = input.checked ? travel : 0;
		drag = {
			input,
			pointerId: e.pointerId,
			startX: e.clientX,
			travel,
			from,
			at: from,
			dragging: false,
		};
	};
	const move = (e: PointerEvent) => {
		if (!drag || e.pointerId !== drag.pointerId) return;
		const dx = e.clientX - drag.startX;
		if (!drag.dragging) {
			if (Math.abs(dx) < DRAG_START_PX) return;
			drag.dragging = true;
			drag.input.setPointerCapture(e.pointerId);
			drag.input.classList.add("knob-drag");
		}
		drag.at = Math.min(drag.travel, Math.max(0, drag.from + dx));
		drag.input.style.setProperty("--knob-x", `${drag.at}px`);
		e.preventDefault();
	};
	const up = (e: PointerEvent) => end(e, false);
	const cancel = (e: PointerEvent) => end(e, true);
	document.addEventListener("pointerdown", down);
	document.addEventListener("pointermove", move, { passive: false });
	document.addEventListener("pointerup", up);
	document.addEventListener("pointercancel", cancel);
	return () => {
		releaseClick?.();
		document.removeEventListener("pointerdown", down);
		document.removeEventListener("pointermove", move);
		document.removeEventListener("pointerup", up);
		document.removeEventListener("pointercancel", cancel);
	};
}
