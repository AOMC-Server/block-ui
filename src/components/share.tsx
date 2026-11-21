import type { ComponentChildren } from "preact";
import { toast } from "./Toast";

/**
 * Copies text to the clipboard, telling the user whether it worked: through `notify` when
 * given, else with a toast (which needs <Toasts /> mounted).
 */
export async function copyText(
	text: string,
	done: string,
	notify: (text: string, kind: "ok" | "error") => void = (t, kind) => {
		toast(t, kind);
	},
) {
	try {
		await navigator.clipboard.writeText(text);
		notify(done, "ok");
	} catch {
		notify("Could not copy; select the text and copy it manually.", "error");
	}
}

export type ExpiryOption = { label: string; value: number | null };

/** A choice of how long something lasts; `null` is "never". */
export function ExpirySelect(props: {
	options: ExpiryOption[];
	value: number | null;
	onChange: (value: number | null) => void;
	label?: string;
}) {
	const key = (v: number | null) => (v === null ? "never" : String(v));
	return (
		<label>
			<span class="label">{props.label ?? "Expires"}</span>
			<select
				value={key(props.value)}
				onChange={(e) =>
					props.onChange(
						e.currentTarget.value === "never"
							? null
							: Number(e.currentTarget.value),
					)
				}
			>
				{props.options.map((x) => (
					<option key={x.label} value={key(x.value)}>
						{x.label}
					</option>
				))}
			</select>
		</label>
	);
}

/** A secret that is only shown once, right after it was created, with a copy button. */
export function ShownOnce(props: {
	intro: ComponentChildren;
	value: string;
	label: string;
	copied: string;
	onDone?: () => void;
	/** How to tell the user the copy worked; default a toast. */
	notify?: (text: string, kind: "ok" | "error") => void;
}) {
	return (
		<div class="shown-once">
			<p class="muted">{props.intro}</p>
			<div class="copy-row">
				<input
					type="text"
					readOnly
					value={props.value}
					aria-label={props.label}
					onFocus={(e) => e.currentTarget.select()}
				/>
				<button
					type="button"
					class="btn"
					onClick={() => void copyText(props.value, props.copied, props.notify)}
				>
					Copy
				</button>
				{props.onDone && (
					<button type="button" class="btn" onClick={props.onDone}>
						Done
					</button>
				)}
			</div>
		</div>
	);
}
