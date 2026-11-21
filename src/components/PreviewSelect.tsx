import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

export type SelectOption<T extends string | number> = {
	value: T;
	label: string;
	/** A picture of what the option stands for, shown before its name. */
	preview: ComponentChildren;
	/**
	 * Attributes for a wrapper that gives the row a palette of its own, e.g. the result of
	 * `paletteScope(...)` from the theme module; the row is then tinted by it.
	 */
	scope?: Record<string, string>;
};

/**
 * A drop-down list whose options carry a picture (a native select cannot show them).
 * Arrow keys move between the options, Escape closes the list.
 */
export function PreviewSelect<T extends string | number>(props: {
	options: SelectOption<T>[];
	value: T;
	onChange: (value: T) => void;
	label: string;
	/** The preview is wide and stretches to fill the row, after the name instead of before it. */
	wide?: boolean;
}) {
	const { options, value } = props;
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const current = options.find((o) => o.value === value) ?? options[0];

	useEffect(() => {
		if (!open) return;
		const onDown = (e: PointerEvent) => {
			if (!ref.current?.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener("pointerdown", onDown);
		return () => document.removeEventListener("pointerdown", onDown);
	}, [open]);

	const choose = (next: T) => {
		setOpen(false);
		if (next !== value) props.onChange(next);
		ref.current?.querySelector("button")?.focus();
	};

	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Escape" && open) {
			e.preventDefault();
			e.stopPropagation();
			setOpen(false);
			return;
		}
		if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
		e.preventDefault();
		if (!open) {
			setOpen(true);
			return;
		}
		const items = [
			...(ref.current?.querySelectorAll<HTMLElement>("[role=option]") ?? []),
		];
		const at = items.indexOf(document.activeElement as HTMLElement);
		const step = e.key === "ArrowDown" ? 1 : -1;
		items[(at + step + items.length) % items.length]?.focus();
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: the keys are handled for the button and list inside
		<div
			class={`preview-select ${props.wide ? "wide" : ""}`}
			ref={ref}
			onKeyDown={onKeyDown}
		>
			<div class="palette-scope" {...current?.scope}>
				<button
					type="button"
					class="preview-select-button"
					aria-haspopup="listbox"
					aria-label={props.label}
					aria-expanded={open}
					onClick={() => setOpen(!open)}
				>
					{current?.preview}
					<span class="preview-select-name">{current?.label}</span>
				</button>
			</div>
			{open && (
				<div
					class="preview-select-list"
					role="listbox"
					aria-label={props.label}
				>
					{options.map((o) => (
						<div key={o.value} class="palette-scope" {...o.scope}>
							<button
								type="button"
								role="option"
								aria-selected={o.value === value}
								class={`preview-select-option ${o.value === value ? "selected" : ""}`}
								onClick={() => choose(o.value)}
							>
								{o.preview}
								<span class="preview-select-name">{o.label}</span>
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
