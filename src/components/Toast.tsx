import { signal } from "@preact/signals";

export type ToastKind = "info" | "ok" | "error";

type ToastItem = { id: number; text: string; kind: ToastKind };

const toasts = signal<ToastItem[]>([]);
let nextId = 1;

/** How long a toast stays when `ms` is not given. */
export const TOAST_MS: Record<ToastKind, number> = {
	info: 3000,
	ok: 3000,
	error: 6000,
};

export function dismissToast(id: number) {
	toasts.value = toasts.value.filter((t) => t.id !== id);
}

/** Removes every toast. */
export function clearToasts() {
	toasts.value = [];
}

/** Shows a message for a few seconds. Needs <Toasts /> to be mounted once. Returns its id. */
export function toast(text: string, kind: ToastKind = "info", ms?: number) {
	const id = nextId++;
	toasts.value = [...toasts.value, { id, text, kind }];
	setTimeout(() => dismissToast(id), ms ?? TOAST_MS[kind]);
	return id;
}

/** The stack of toasts. Mount it once, at the root of the app; see --toast-* tokens for placement. */
export function Toasts() {
	return (
		<div class="toasts" aria-live="polite">
			{toasts.value.map((t) => (
				<div
					key={t.id}
					class={`toast ${t.kind}`}
					role={t.kind === "error" ? "alert" : "status"}
				>
					{t.text}
				</div>
			))}
		</div>
	);
}
