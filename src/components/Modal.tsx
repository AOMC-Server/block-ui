import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";

/** Open modals, oldest first; only the last one reacts to the keyboard. */
const stack: symbol[] = [];

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const focusablesIn = (root: HTMLElement) =>
	[...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
		(el) => !el.hidden && el.getClientRects().length > 0,
	);

export type ModalProps = {
	title: string;
	onClose: () => void;
	/** A wider dialog (tables, previews). */
	wide?: boolean;
	/** A bar under the body, for the buttons (rendered as `.modal-foot`). */
	footer?: ComponentChildren;
	/** Pressing the dimmed backdrop closes it. Off by default: a text selection that ends there would close it. */
	closeOnBackdrop?: boolean;
	class?: string;
	children: ComponentChildren;
};

/**
 * Centered dialog with a title bar, over a dimmed backdrop. Focus moves into it, stays inside
 * while Tab is used, and goes back where it was on close. Escape closes the topmost one only,
 * before anything else sees the key.
 */
export function Modal(props: ModalProps) {
	const dialog = useRef<HTMLDivElement>(null);
	const onClose = useRef(props.onClose);
	onClose.current = props.onClose;

	useEffect(() => {
		const id = Symbol("modal");
		stack.push(id);
		const opener = document.activeElement as HTMLElement | null;
		const root = dialog.current;
		if (root) {
			const body = root.querySelector<HTMLElement>(".modal-body");
			(
				(body && focusablesIn(body)[0]) ||
				focusablesIn(root)[0] ||
				root
			).focus();
		}

		const onKey = (e: KeyboardEvent) => {
			if (stack.at(-1) !== id) return;
			if (e.key === "Escape") {
				e.stopImmediatePropagation();
				onClose.current();
				return;
			}
			if (e.key !== "Tab" || !root) return;
			const items = focusablesIn(root);
			const first = items[0];
			const last = items.at(-1);
			if (!first || !last) {
				e.preventDefault();
				root.focus();
			} else if (!root.contains(document.activeElement)) {
				e.preventDefault();
				first.focus();
			} else if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		};
		window.addEventListener("keydown", onKey, true);
		return () => {
			window.removeEventListener("keydown", onKey, true);
			stack.splice(stack.indexOf(id), 1);
			if (opener?.isConnected) opener.focus();
		};
	}, []);

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: backdrop click is a convenience; Escape and the close button are the accessible ways
		<div
			class="modal-backdrop"
			onMouseDown={(e) => {
				if (props.closeOnBackdrop && e.target === e.currentTarget)
					props.onClose();
			}}
		>
			<div
				class={`modal ${props.wide ? "wide" : ""} ${props.class ?? ""}`}
				role="dialog"
				aria-modal="true"
				aria-label={props.title}
				tabIndex={-1}
				ref={dialog}
			>
				<header class="modal-head">
					<h2>{props.title}</h2>
					<button
						type="button"
						class="btn small close"
						aria-label="Close"
						onClick={props.onClose}
					>
						×
					</button>
				</header>
				<div class="modal-body">{props.children}</div>
				{props.footer && <footer class="modal-foot">{props.footer}</footer>}
			</div>
		</div>
	);
}

/** A question with Cancel and a confirm button (red when `danger`). */
export function Confirm(props: {
	title: string;
	children: ComponentChildren;
	confirmLabel?: string;
	cancelLabel?: string;
	danger?: boolean;
	/** Disables both buttons, while the confirmed action runs. */
	busy?: boolean;
	/** Pressing the dimmed backdrop cancels, like Escape (see Modal). */
	closeOnBackdrop?: boolean;
	onConfirm: () => void;
	onClose: () => void;
}) {
	return (
		<Modal
			title={props.title}
			closeOnBackdrop={props.closeOnBackdrop}
			onClose={props.onClose}
			footer={
				<>
					<button
						type="button"
						class="btn"
						disabled={props.busy}
						onClick={props.onClose}
					>
						{props.cancelLabel ?? "Cancel"}
					</button>
					<button
						type="button"
						class={`btn ${props.danger ? "danger" : "primary"}`}
						disabled={props.busy}
						onClick={props.onConfirm}
					>
						{props.confirmLabel ?? "Confirm"}
					</button>
				</>
			}
		>
			{props.children}
		</Modal>
	);
}
