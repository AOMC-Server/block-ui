import { signal } from "@preact/signals";
import { cx } from "../lib/cx";

export type ToastKind = "info" | "ok" | "error";

type ToastItem = { id: number; text: string; kind: ToastKind };

const toasts = signal<ToastItem[]>([]);
const timers = new Map<number, ReturnType<typeof setTimeout>>();
let nextId = 1;

/** How long a toast stays when `ms` is not given. */
const TOAST_MS: Record<ToastKind, number> = {
	info: 3000,
	ok: 3000,
	error: 6000,
};

/** Removes a toast (the id `toast` returned) before its time is up. */
export function dismissToast(id: number) {
	clearTimeout(timers.get(id));
	timers.delete(id);
	toasts.value = toasts.value.filter((t) => t.id !== id);
}

/** Removes every toast. Only the tests use it, so the package entry leaves it out. */
export function clearToasts() {
	for (const id of [...timers.keys()]) dismissToast(id);
	toasts.value = [];
}

/** Shows a message for a few seconds. Needs <Toasts /> to be mounted once. Returns its id. */
export function toast(text: string, kind: ToastKind = "info", ms?: number) {
	const id = nextId++;
	toasts.value = [...toasts.value, { id, text, kind }];
	timers.set(
		id,
		setTimeout(() => dismissToast(id), ms ?? TOAST_MS[kind]),
	);
	return id;
}

/**
 * The stack of toasts. Mount it once, at the root of the app; see --toast-* tokens for
 * placement. Each toast announces itself through its own role (`alert` for errors, `status`
 * otherwise), so the stack is not a live region as well.
 */
export function Toasts() {
	return (
		<div class="toasts">
			{toasts.value.map((t) => (
				<div
					key={t.id}
					class={cx("toast", t.kind)}
					role={t.kind === "error" ? "alert" : "status"}
				>
					{t.text}
				</div>
			))}
		</div>
	);
}
